import type { ActionEvent } from "../../../engine";
import { goalDistance, holdFor, isBeatAction, isKeyMoment } from "./classify";
import {
  ACTIVE_DISTANCE,
  BEAT_SETTINGS,
  LEAD_IN_MATCH_SECONDS,
  MIN_DURATION,
  MODE_SETTINGS,
  NEAR_GOAL_SLOWDOWN,
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
  /** True when the action has its own moment at its `MIN_DURATION`; false for actions played through inside a beat and for cuts. */
  moment: boolean;
  /** Index in the log of the first action of the beat this action belongs to; absent for an action shown on its own. */
  beat?: number;
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
  /** Events not yet turned into segments (they wait for the next event, and in highlights for the lead-in horizon). */
  readonly pending: readonly ActionEvent[];
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

type State = Pick<
  Timeline,
  "mode" | "segments" | "duration" | "matchEnd" | "pending" | "committed"
>;

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

/** True when a key moment lies within the lead-in window after `from`; undefined when the log is too short to tell. */
const keyMomentAhead = (pending: readonly ActionEvent[], from: number): boolean | undefined => {
  const start = pending[from] as ActionEvent;
  for (let i = from; i < pending.length; i += 1) {
    const event = pending[i] as ActionEvent;
    if (event.type === "periodChange" || event.time > start.time + LEAD_IN_MATCH_SECONDS)
      return false;
    if (isKeyMoment(event)) return true;
  }
  return undefined;
};

type Placement = {
  event: ActionEvent;
  index: number;
  next: ActionEvent;
  mode: PlaybackMode;
  /** False in highlights outside a key moment's lead-in: the span is cut. */
  shown: boolean;
};

type SegmentDraft = Pick<Segment, "kind" | "eventIndex" | "matchStart" | "matchEnd" | "moment"> &
  Pick<Segment, "beat"> & { seconds: number };

/** Lays drafts end to end from presentation time `start`. */
const lay = (drafts: readonly SegmentDraft[], start: number): readonly Segment[] => {
  const segments: Segment[] = [];
  let at = start;
  for (const { seconds, ...draft } of drafts) {
    segments.push({ ...draft, presentationStart: at, presentationEnd: at + seconds });
    at += seconds;
  }
  return segments;
};

/** The drafts of one action shown on its own: a hold before and after a key moment around its play segment. */
const momentDrafts = ({ event, index, next, mode, shown }: Placement): SegmentDraft[] => {
  const base = { eventIndex: index, matchStart: event.time, matchEnd: next.time };
  if (!shown) return [{ ...base, kind: "cut", seconds: 0, moment: false }];
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
  if (key) drafts.push(hold(key.after * scale, next.time));
  return drafts;
};

/** How far the ball travels in an action; picks the longest action of a beat as a key action. */
const travel = (event: ActionEvent): number =>
  Math.hypot(event.to.x - event.from.x, event.to.y - event.from.y);

/**
 * Indices (in a beat) of the actions that get their own moment: the last (it leads into what follows),
 * the longest and the first, as many as the beat is long enough for and the mode allows.
 */
const keyActionsOf = (
  beat: readonly ActionEvent[],
  settings: { keyActions: number; actionsPerKey: number },
): ReadonlySet<number> => {
  const lastIndex = beat.length - 1;
  let longest = 0;
  beat.forEach((event, i) => {
    if (travel(event) > travel(beat[longest] as ActionEvent)) longest = i;
  });
  const count = Math.min(settings.keyActions, Math.ceil(beat.length / settings.actionsPerKey));
  return new Set([lastIndex, longest, 0].slice(0, count));
};

type BeatPlacement = {
  beat: readonly ActionEvent[];
  firstIndex: number;
  /** Match time the beat ends at: the time of the first action after it. */
  endTime: number;
  mode: PlaybackMode;
  shown: boolean;
};

/** The drafts of a beat: key actions at their minimum, the rest at one pace, the whole between the beat's minimum and maximum. */
const beatDrafts = ({ beat, firstIndex, endTime, mode, shown }: BeatPlacement): SegmentDraft[] => {
  const settings = BEAT_SETTINGS[mode];
  const keys = shown ? keyActionsOf(beat, settings) : new Set<number>();
  const spanOf = (i: number): number =>
    (beat[i + 1]?.time ?? endTime) - (beat[i] as ActionEvent).time;
  const restSpan = beat.reduce((sum, _, i) => sum + (keys.has(i) ? 0 : spanOf(i)), 0);
  const keySeconds = beat.reduce(
    (sum, event, i) => sum + (keys.has(i) ? momentDuration(event, mode) : 0),
    0,
  );
  const wanted = Math.min(
    settings.maxDuration,
    Math.max(settings.minDuration, keySeconds + restSpan * settings.pace),
  );
  const restSeconds = Math.max(wanted - keySeconds, restSpan * 0.001);
  return beat.map((event, i) => {
    const base = {
      eventIndex: firstIndex + i,
      matchStart: event.time,
      matchEnd: beat[i + 1]?.time ?? endTime,
      beat: firstIndex,
    };
    if (!shown) return { ...base, kind: "cut", seconds: 0, moment: false, beat: undefined };
    if (keys.has(i))
      return { ...base, kind: "play", seconds: momentDuration(event, mode), moment: true };
    const share = restSpan === 0 ? 0 : spanOf(i) / restSpan;
    return { ...base, kind: "play", seconds: restSeconds * share, moment: false };
  });
};

type Step = { state: State; done: boolean };

const advance = (state: State, fresh: readonly Segment[], matchEnd: number, count = 1): State => ({
  ...state,
  segments: [...state.segments, ...fresh],
  duration: fresh.at(-1)?.presentationEnd ?? state.duration,
  matchEnd,
  pending: state.pending.slice(count),
  committed: state.committed + count,
});

/** Whether `pending[i]` is shown (always, except in highlights outside a key moment's lead-in); undefined when unknown yet. */
const isShownAt = (state: State, i: number): boolean | undefined => {
  const event = state.pending[i] as ActionEvent;
  if (state.mode !== "highlights" || isKeyMoment(event)) return true;
  return keyMomentAhead(state.pending, i);
};

type BeatRun = { length: number; shown: boolean };

/**
 * The beat that starts at `pending[0]`: consecutive quiet actions that are all shown or all cut and
 * span at most the mode's longest beat. Undefined while the log is too short to tell where it ends.
 */
const beatRun = (state: State): BeatRun | undefined => {
  const { pending, mode } = state;
  const first = pending[0] as ActionEvent;
  const shown = isShownAt(state, 0);
  if (shown === undefined) return undefined;
  let length = 1;
  for (; length < pending.length; length += 1) {
    const event = pending[length] as ActionEvent;
    if (!isBeatAction(event, mode) || event.time - first.time > BEAT_SETTINGS[mode].maxSpan) break;
    const same = isShownAt(state, length);
    if (same === undefined) return undefined;
    if (same !== shown) break;
  }
  return length < pending.length ? { length, shown } : undefined;
};

const commitBeat = (state: State): Step => {
  const run = beatRun(state);
  if (!run) return { state, done: true };
  const beat = state.pending.slice(0, run.length);
  const end = state.pending[run.length] as ActionEvent;
  const { mode, committed: firstIndex } = state;
  const drafts = beatDrafts({ beat, firstIndex, endTime: end.time, mode, shown: run.shown });
  const fresh = lay(drafts, state.duration);
  return { state: advance(state, fresh, end.time, run.length), done: false };
};

const commitNext = (state: State): Step => {
  const [event, next] = state.pending;
  if (!event) return { state, done: true };
  if (event.type === "periodChange")
    return { state: advance(state, [], state.matchEnd), done: false };
  if (isBeatAction(event, state.mode)) return commitBeat(state);
  if (!next) return { state, done: true };
  const shown = isShownAt(state, 0);
  if (shown === undefined) return { state, done: true };
  const { mode, duration: start, committed: index } = state;
  const fresh = lay(momentDrafts({ event, index, next, mode, shown }), start);
  return { state: advance(state, fresh, next.time), done: false };
};

const commitAll = (initial: State): State => {
  let step = commitNext(initial);
  while (!step.done) step = commitNext(step.state);
  return step.state;
};

/** The timeline of `events` (the engine log, or the part of it known so far) in `mode`. */
export const buildTimeline = (events: readonly ActionEvent[], mode: PlaybackMode): Timeline =>
  extendTimeline(
    toTimeline({ mode, segments: [], duration: 0, matchEnd: 0, pending: [], committed: 0 }),
    events,
  );

/** The timeline after `newEvents` were appended to its log. Earlier segments are never changed. */
export const extendTimeline = (timeline: Timeline, newEvents: readonly ActionEvent[]): Timeline =>
  toTimeline(commitAll({ ...timeline, pending: [...timeline.pending, ...newEvents] }));
