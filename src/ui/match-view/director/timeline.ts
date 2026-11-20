import { type ActionEvent, type Phase, toPhases } from "../../../engine";
import { goalDistance, holdFor, isKeyMoment } from "./classify";
import {
  ACTIVE_DISTANCE,
  MIN_DURATION,
  MODE_SETTINGS,
  NEAR_GOAL_SLOWDOWN,
  PHASE_SETTINGS,
  type PlaybackMode,
  SLOWDOWN_FULL_DISTANCE,
} from "./constants";

/**
 * `play`: match time runs from `matchStart` to `matchEnd` over the presentation span.
 * `hold`: the clock stands still (`matchStart === matchEnd`) while the views keep animating.
 * `cut`: highlights jump over `matchStart` to `matchEnd` in no presentation time.
 */
export type SegmentKind = "play" | "hold" | "cut";

export type Segment = {
  kind: SegmentKind;
  /** Index in the engine log of the action this segment belongs to. */
  eventIndex: number;
  presentationStart: number;
  presentationEnd: number;
  matchStart: number;
  matchEnd: number;
  /** True when the action has its own moment at its `MIN_DURATION` (the ending action of a phase and key moments); false for actions played through inside a phase and for cuts. */
  moment: boolean;
  /** Index in the log of the first action of the phase this action belongs to. */
  phase: number;
};

/**
 * A monotone piecewise-linear mapping between presentation time (wall seconds) and match time. Segments
 * are contiguous in both. Immutable: `extendTimeline` returns a new timeline sharing the earlier segments.
 */
export type Timeline = {
  readonly mode: PlaybackMode;
  readonly segments: readonly Segment[];
  /** Presentation seconds covered by the committed segments. */
  readonly duration: number;
  /** Match time the committed segments end at; where the timeline stops until it is extended. */
  readonly matchEnd: number;
  /** Every event of the log known so far; the ones from index `committed` on wait until their phase is final. */
  readonly log: readonly ActionEvent[];
  /** Number of events already turned into segments. */
  readonly committed: number;
  /** Match time at `presentationSeconds`; before 0 the first, after `duration` the last match time. */
  matchTimeAt: (presentationSeconds: number) => number;
  /** The first presentation time at which `matchSeconds` is reached; a match time skipped by a cut maps to the cut. */
  presentationTimeAt: (matchSeconds: number) => number;
};

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** 0 at `edge0`, 1 at `edge1` (either order), smooth in between. */
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Index of the first element for which `isAfter` is true, or `length` (`isAfter` must be monotone). */
const firstWhere = <T>(items: readonly T[], isAfter: (item: T) => boolean): number => {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (isAfter(items[mid] as T)) high = mid;
    else low = mid + 1;
  }
  return low;
};

const interpolate = (a: number, b: number, t: number): number => a + (b - a) * t;

const matchTimeIn = (timeline: Pick<Timeline, "segments" | "duration" | "matchEnd">, p: number) => {
  const { segments } = timeline;
  const first = segments[0];
  if (!first) return 0;
  if (p >= timeline.duration) return timeline.matchEnd;
  if (p <= 0) return first.matchStart;
  const segment = segments[firstWhere(segments, (s) => s.presentationEnd > p)];
  if (!segment) return timeline.matchEnd;
  const span = segment.presentationEnd - segment.presentationStart;
  return interpolate(segment.matchStart, segment.matchEnd, (p - segment.presentationStart) / span);
};

const presentationTimeIn = (
  timeline: Pick<Timeline, "segments" | "duration">,
  m: number,
): number => {
  const { segments } = timeline;
  const first = segments[0];
  if (!first || m <= first.matchStart) return 0;
  const segment = segments[firstWhere(segments, (s) => s.matchEnd >= m)];
  if (!segment) return timeline.duration;
  if (segment.kind === "cut") return segment.presentationStart;
  const span = segment.matchEnd - segment.matchStart;
  const t = span === 0 ? 1 : (m - segment.matchStart) / span;
  return interpolate(segment.presentationStart, segment.presentationEnd, t);
};

type State = Pick<Timeline, "mode" | "segments" | "duration" | "matchEnd" | "log" | "committed">;

const toTimeline = (state: State): Timeline => ({
  ...state,
  matchTimeAt: (p) => matchTimeIn(state, p),
  presentationTimeAt: (m) => presentationTimeIn(state, m),
});

/** Presentation seconds an action with its own moment stays on screen: its minimum, stretched in front of goal. */
const momentDuration = (event: ActionEvent, mode: PlaybackMode): number => {
  const distance = goalDistance(event);
  const slowdown =
    1 + NEAR_GOAL_SLOWDOWN * smoothstep(ACTIVE_DISTANCE[mode], SLOWDOWN_FULL_DISTANCE, distance);
  return MIN_DURATION[event.type] * MODE_SETTINGS[mode].minimumScale * slowdown;
};

type SegmentDraft = Pick<Segment, "kind" | "eventIndex" | "matchStart" | "matchEnd" | "moment"> & {
  seconds: number;
};

/** Lays drafts end to end from presentation time `start`, tagging each with the phase's first log index. */
const lay = (drafts: readonly SegmentDraft[], start: number, phase: number): readonly Segment[] => {
  const segments: Segment[] = [];
  let at = start;
  for (const { seconds, ...draft } of drafts) {
    segments.push({ ...draft, phase, presentationStart: at, presentationEnd: at + seconds });
    at += seconds;
  }
  return segments;
};

type Placement = {
  events: readonly ActionEvent[];
  /** Log indices of the phase's actions. */
  indices: readonly number[];
  /** Match time the phase ends at: the time of the first action after it. */
  endTime: number;
  mode: PlaybackMode;
  shown: boolean;
};

/** The drafts of one action shown on its own: a hold before and after a key moment around its play segment. */
const momentDrafts = (event: ActionEvent, index: number, end: number, mode: PlaybackMode) => {
  const base = { eventIndex: index, matchStart: event.time, matchEnd: end };
  const key = holdFor(event);
  const scale = MODE_SETTINGS[mode].holdScale;
  const drafts: SegmentDraft[] = [];
  const hold = (seconds: number, time: number): SegmentDraft => ({
    ...base,
    kind: "hold",
    seconds,
    matchStart: time,
    matchEnd: time,
    moment: false,
  });
  if (key) drafts.push(hold(key.before * scale, event.time));
  drafts.push({ ...base, kind: "play", seconds: momentDuration(event, mode), moment: true });
  if (key) drafts.push(hold(key.after * scale, end));
  return drafts;
};

/**
 * The drafts of a phase: its ending action (and any key moment inside it) at its own moment, every
 * other action at one pace, so the clock runs at one speed through the build-up and the ball moves
 * without a pause between passes. The build-up takes between the mode's `minBuildUp` and
 * `maxBuildUp` presentation seconds.
 */
const phaseDrafts = ({ events, indices, endTime, mode, shown }: Placement): SegmentDraft[] => {
  const timeAfter = (k: number): number => events[indices[k + 1] ?? -1]?.time ?? endTime;
  if (!shown)
    return indices.map((eventIndex, k) => ({
      eventIndex,
      matchStart: (events[eventIndex] as ActionEvent).time,
      matchEnd: timeAfter(k),
      kind: "cut",
      seconds: 0,
      moment: false,
    }));
  const lastK = indices.length - 1;
  const ownMoment = (k: number): boolean =>
    k === lastK || isKeyMoment(events[indices[k] as number] as ActionEvent);
  const spanOf = (k: number): number =>
    timeAfter(k) - (events[indices[k] as number] as ActionEvent).time;
  const settings = PHASE_SETTINGS[mode];
  const buildUpSpan = indices.reduce((sum, _, k) => sum + (ownMoment(k) ? 0 : spanOf(k)), 0);
  const buildUp = Math.min(
    settings.maxBuildUp,
    Math.max(settings.minBuildUp, buildUpSpan * settings.pace),
  );
  return indices.flatMap((eventIndex, k) => {
    const event = events[eventIndex] as ActionEvent;
    if (ownMoment(k)) return momentDrafts(event, eventIndex, timeAfter(k), mode);
    const share = buildUpSpan === 0 ? 0 : spanOf(k) / buildUpSpan;
    return [
      {
        eventIndex,
        matchStart: event.time,
        matchEnd: timeAfter(k),
        kind: "play" as const,
        seconds: buildUp * share,
        moment: false,
      },
    ];
  });
};

type Step = { state: State; done: boolean };

/** The phases after the one being committed that must be known before it is final: merging looks one phase ahead and folds can carry on. */
const PHASES_AHEAD = 2;

/** A phase is shown in every mode, except in highlights where only phases with a key moment or a shot are. */
const isShown = (log: readonly ActionEvent[], phase: Phase, mode: PlaybackMode): boolean =>
  mode !== "highlights" ||
  phase.outcome === "shot" ||
  phase.outcome === "goal" ||
  phase.actions.some((i) => isKeyMoment(log[i] as ActionEvent));

/**
 * Whether `phases[index]` cannot change any more as the log grows: a period change after it settles
 * it (phases never cross a period), else it waits until `PHASES_AHEAD` phases follow.
 */
const isSettled = (
  log: readonly ActionEvent[],
  phases: readonly Phase[],
  index: number,
): boolean => {
  const phase = phases[index] as Phase;
  if (phases.length - index > PHASES_AHEAD) return true;
  const last = phase.actions.at(-1) as number;
  return log.some((e, i) => i > last && e.type === "periodChange");
};

const commitPhase = (state: State, phases: readonly Phase[]): Step => {
  const { log, mode, committed } = state;
  const index = phases.findIndex((p) => p.actions[0] === committed);
  const phase = phases[index];
  if (!phase || !isSettled(log, phases, index)) return { state, done: true };
  const count = phase.actions.length;
  const played = phase.actions.filter((i) => (log[i] as ActionEvent).type !== "periodChange");
  const next: State = { ...state, committed: committed + count };
  if (played.length === 0) return { state: next, done: false };
  const end = log[committed + count] as ActionEvent;
  const drafts = phaseDrafts({
    events: log,
    indices: played,
    endTime: end.time,
    mode,
    shown: isShown(log, phase, mode),
  });
  const fresh = lay(drafts, state.duration, committed);
  return {
    state: {
      ...next,
      segments: [...state.segments, ...fresh],
      duration: fresh.at(-1)?.presentationEnd ?? state.duration,
      matchEnd: end.time,
    },
    done: false,
  };
};

const commitAll = (initial: State): State => {
  const phases = toPhases(initial.log);
  let step = commitPhase(initial, phases);
  while (!step.done) step = commitPhase(step.state, phases);
  return step.state;
};

/** The timeline of `events` (the engine log, or the part of it known so far) in `mode`. */
export const buildTimeline = (events: readonly ActionEvent[], mode: PlaybackMode): Timeline =>
  extendTimeline(
    toTimeline({ mode, segments: [], duration: 0, matchEnd: 0, log: [], committed: 0 }),
    events,
  );

/** The timeline after `newEvents` were appended to its log. Earlier segments are never changed. */
export const extendTimeline = (timeline: Timeline, newEvents: readonly ActionEvent[]): Timeline =>
  newEvents.length === 0
    ? timeline
    : toTimeline(commitAll({ ...timeline, log: [...timeline.log, ...newEvents] }));
