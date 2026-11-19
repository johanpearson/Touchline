import type { ActionEvent } from "../../../engine";
import { goalDistance, holdFor, isKeyMoment } from "./classify";
import {
  ACTIVE_DISTANCE,
  BUILD_UP_DISTANCE,
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

/** Presentation seconds the action `event` stays on screen; `atPace` forces full pace (lead-in and key moments). */
const playDuration = (
  event: ActionEvent,
  span: number,
  mode: PlaybackMode,
  atPace: boolean,
): number => {
  const settings = MODE_SETTINGS[mode];
  const distance = goalDistance(event);
  const nearness = atPace
    ? 1
    : smoothstep(BUILD_UP_DISTANCE[mode], ACTIVE_DISTANCE[mode], distance);
  const quiet = Math.max(span * settings.quietFraction, settings.quietFloor);
  const slowdown =
    1 + NEAR_GOAL_SLOWDOWN * smoothstep(ACTIVE_DISTANCE[mode], SLOWDOWN_FULL_DISTANCE, distance);
  const active = MIN_DURATION[event.type] * settings.minimumScale * slowdown;
  return interpolate(quiet, active, nearness);
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

const segmentsOf = (
  event: ActionEvent,
  index: number,
  next: ActionEvent,
  mode: PlaybackMode,
  start: number,
  highlight: boolean,
): readonly Segment[] => {
  const segments: Segment[] = [];
  let at = start;
  const add = (kind: SegmentKind, seconds: number, matchStart: number, matchEnd: number) => {
    segments.push({
      kind,
      eventIndex: index,
      presentationStart: at,
      presentationEnd: at + seconds,
      matchStart,
      matchEnd,
    });
    at += seconds;
  };
  const key = holdFor(event);
  const scale = MODE_SETTINGS[mode].holdScale;
  if (!highlight) {
    add("cut", 0, event.time, next.time);
    return segments;
  }
  if (key) add("hold", key.before * scale, event.time, event.time);
  const atPace = mode === "highlights" || key !== undefined;
  add("play", playDuration(event, next.time - event.time, mode, atPace), event.time, next.time);
  if (key) add("hold", key.after * scale, next.time, next.time);
  return segments;
};

type Step = { state: State; done: boolean };

const commitNext = (state: State): Step => {
  const [event, next] = state.pending;
  if (!event) return { state, done: true };
  const rest = state.pending.slice(1);
  if (event.type === "periodChange") {
    return { state: { ...state, pending: rest, committed: state.committed + 1 }, done: false };
  }
  if (!next) return { state, done: true };
  const ahead = state.mode === "highlights" ? keyMomentAhead(state.pending, 0) : true;
  if (ahead === undefined) return { state, done: true };
  const highlight = state.mode !== "highlights" || ahead || isKeyMoment(event);
  const fresh = segmentsOf(event, state.committed, next, state.mode, state.duration, highlight);
  const last = fresh.at(-1);
  return {
    done: false,
    state: {
      ...state,
      segments: [...state.segments, ...fresh],
      duration: last ? last.presentationEnd : state.duration,
      matchEnd: next.time,
      pending: rest,
      committed: state.committed + 1,
    },
  };
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
