import { useEffect, useRef, useState } from "react";
import type { ActionEvent, ActionMatch, ActionMatchChange, Period, Side } from "../../engine";
import { buildTimeline, extendTimeline, type PlaybackMode, type Timeline } from "./director";
import { ENGINE_STEP_MATCH_SECONDS, LOOKAHEAD_SECONDS } from "./playback";
import { advancePresented, INITIAL_PRESENTED, type PresentedState } from "./presented-state";
import { usePlaybackModeChoice } from "./use-playback-mode";

const DEFAULT_TICK_MS = 100;

/** What the match screen shows of the state: the score and period at the director's clock. */
export type PresentedMatchState = { period: Period; score: Record<Side, number> };

export type MatchPlayback = {
  /** The match time at the presentation clock; every view follows this and nothing else. */
  matchTime: number;
  state: PresentedMatchState;
  /**
   * The whole log read so far, up to the lookahead ahead of the clock. The array is appended to in
   * place: use `eventCount` for the part the clock has reached.
   */
  events: readonly ActionEvent[];
  /** How many events the clock has reached. */
  eventCount: number;
  paused: boolean;
  mode: PlaybackMode;
  setPaused: (paused: boolean) => void;
  setMode: (mode: PlaybackMode) => void;
  /** Starts the second half, applying the user's change first; only valid at half-time. */
  resume: (change?: ActionMatchChange) => void;
};

const isPlaying = (period: Period): boolean => period === "firstHalf" || period === "secondHalf";

/** The mutable core of a run: the log, its timeline, the presentation clock and what is presented. */
type Run = {
  events: ActionEvent[];
  timeline: Timeline;
  /** Presentation seconds played so far. */
  clock: number;
  presented: PresentedState;
};

type View = { matchTime: number; presented: PresentedState };

const createRun = (match: ActionMatch, mode: PlaybackMode): Run => {
  const events = [...match.events];
  const timeline = buildTimeline(events, mode);
  return {
    events,
    timeline,
    clock: 0,
    presented: advancePresented(INITIAL_PRESENTED, events, timeline, { clock: 0, matchTime: 0 }),
  };
};

/** Appends what the engine logged since the last call and extends the timeline with it. */
const pull = (run: Run, match: ActionMatch) => {
  const fresh = match.events.slice(run.events.length);
  if (fresh.length === 0) return;
  run.events.push(...fresh);
  run.timeline = extendTimeline(run.timeline, fresh);
};

/** Advances the engine until `done` holds or the engine stops at half-time or full time. */
const advanceUntil = (run: Run, match: ActionMatch, done: () => boolean) => {
  pull(run, match);
  while (!done() && isPlaying(match.state.period)) {
    match.advanceTo(match.state.time + ENGINE_STEP_MATCH_SECONDS);
    pull(run, match);
  }
};

const viewOf = (run: Run): View => {
  const matchTime = run.timeline.matchTimeAt(run.clock);
  run.presented = advancePresented(run.presented, run.events, run.timeline, {
    clock: run.clock,
    matchTime,
  });
  return { matchTime, presented: run.presented };
};

/**
 * Drives a match from the wall clock through the playback director. The hook keeps a presentation
 * clock; `matchTime` is `timeline.matchTimeAt(clock)`. The engine runs ahead of the clock by
 * `LOOKAHEAD_SECONDS` of presentation time, so the timeline always covers the next moments, and the
 * timeline is extended as events arrive. The clock stops on its own at half-time and full time.
 * The score, period and event count the views see are those at the clock, never the engine's.
 */
export const useMatchPlayback = (
  match: ActionMatch,
  tickMs: number = DEFAULT_TICK_MS,
): MatchPlayback => {
  const [paused, setPaused] = useState(false);
  const [mode, chooseMode] = usePlaybackModeChoice();
  const runRef = useRef<Run | null>(null);
  runRef.current ??= createRun(match, mode);
  const run = runRef.current;
  const [view, setView] = useState<View>(() => viewOf(run));

  // `run` and `match` are stable for the life of the hook.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const wallSeconds = (now - last) / 1000;
      last = now;
      if (paused || !isPlaying(run.presented.period)) return;
      run.clock += wallSeconds;
      advanceUntil(run, match, () => run.timeline.duration >= run.clock + LOOKAHEAD_SECONDS);
      run.clock = Math.min(run.clock, run.timeline.duration);
      setView(viewOf(run));
    }, tickMs);
    return () => clearInterval(id);
  }, [match, paused, tickMs]);

  const setMode = (next: PlaybackMode) => {
    chooseMode(next);
    if (next === run.timeline.mode) return;
    const matchTime = run.timeline.matchTimeAt(run.clock);
    run.timeline = buildTimeline(run.events, next);
    advanceUntil(run, match, () => run.timeline.matchEnd >= matchTime);
    run.clock = isPlaying(run.presented.period)
      ? run.timeline.presentationTimeAt(matchTime)
      : run.timeline.duration;
    setView(viewOf(run));
  };

  const resume = (change?: ActionMatchChange) => {
    if (match.state.period !== "halfTime") return;
    if (change) match.applyChange(change);
    match.resume();
    pull(run, match);
    setView(viewOf(run));
  };

  return {
    matchTime: view.matchTime,
    state: { period: view.presented.period, score: view.presented.score },
    events: run.events,
    eventCount: view.presented.eventCount,
    paused,
    mode,
    setPaused,
    setMode,
    resume,
  };
};
