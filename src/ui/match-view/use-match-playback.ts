import { useEffect, useRef, useState } from "react";
import {
  type ActionEvent,
  type ActionMatch,
  type ActionMatchChange,
  chancesOf,
  type Period,
  type PhaseStep,
  type Side,
  type StepChance,
  type TimedActionMatchChange,
} from "../../engine";
import {
  buildTimeline,
  chanceMomentAt,
  extendTimeline,
  type PlaybackMode,
  type SegmentChance,
  type Timeline,
} from "./director";
import {
  createEnergyTrack,
  type Energy,
  type EnergyTrack,
  energyAt,
  recordEnergy,
} from "./energy-track";
import { ENGINE_STEP_MATCH_SECONDS, LOOKAHEAD_SECONDS } from "./playback";
import { advancePresented, INITIAL_PRESENTED, type PresentedState } from "./presented-state";
import { usePlaybackModeChoice } from "./use-playback-mode";

const DEFAULT_TICK_MS = 100;

/** What the match screen shows of the state: the score and period at the director's clock. */
export type PresentedMatchState = { period: Period; score: Record<Side, number> };

/**
 * Where a resumed match stands: the match is already advanced to `matchTime` and shows paused;
 * `changes` are the user's changes it was rebuilt with.
 */
export type RestoredPlayback = {
  matchTime: number;
  mode: PlaybackMode;
  changes: readonly TimedActionMatchChange[];
};

export type MatchPlayback = {
  /** The match time at the presentation clock; every view follows this and nothing else. */
  matchTime: number;
  /** The clear chance on screen at the clock (engine v3 matches), for the stage cue; undefined otherwise. */
  chance: SegmentChance | undefined;
  state: PresentedMatchState;
  /**
   * The whole log read so far, up to the lookahead ahead of the clock. The array is appended to in
   * place: use `eventCount` for the part the clock has reached.
   */
  events: readonly ActionEvent[];
  /** How many events the clock has reached. */
  eventCount: number;
  /**
   * Energy (0 to 100) by player id at the clock, from what the engine reported when it simulated
   * up to there; a player not listed has not played and is at full energy. Never the engine's own
   * energy from the lookahead.
   */
  energy: Energy;
  paused: boolean;
  mode: PlaybackMode;
  setPaused: (paused: boolean) => void;
  setMode: (mode: PlaybackMode) => void;
  /**
   * Applies the user's change from the next action at the engine's current time and records it;
   * valid while the match is on or at half-time. Returns the engine time it was applied at, or
   * undefined when it was refused (full time, or the engine rejected it).
   */
  applyChange: (change: ActionMatchChange) => number | undefined;
  /** Starts the second half, applying the user's change first; only valid at half-time. */
  resume: (change?: ActionMatchChange) => void;
  /**
   * The changes the user applied with `resume`, with the engine time they were applied at (the
   * AI's own changes are not in it). Appended to in place; `userChangeCount` tells when it grew.
   */
  userChanges: readonly TimedActionMatchChange[];
  userChangeCount: number;
};

const isPlaying = (period: Period): boolean => period === "firstHalf" || period === "secondHalf";

/** The mutable core of a run: the log, its timeline, the presentation clock and what is presented. */
type Run = {
  events: ActionEvent[];
  timeline: Timeline;
  /** Presentation seconds played so far. */
  clock: number;
  presented: PresentedState;
  /** The engine's energy sampled after every step, to be read at the clock. */
  energy: EnergyTrack;
  /** The clear and other chances of the engine v3 steps played so far; empty on engine v2. */
  chances: StepChance[];
};

type View = {
  matchTime: number;
  presented: PresentedState;
  energy: Energy;
  chance: SegmentChance | undefined;
};

/** A match that may carry the engine v3 steps (`createMatch`); a v2 match has none, so no chance moments. */
type ObservedMatch = ActionMatch & { readonly steps?: readonly PhaseStep[] };

/** The chances of the steps the engine has played that the run does not know yet. */
const newChances = (run: Run, match: ObservedMatch): StepChance[] =>
  chancesOf(match.steps ?? []).slice(run.chances.length);

/** Appends what the engine logged since the last call and extends the timeline with it. */
const pull = (run: Run, match: ObservedMatch) => {
  recordEnergy(run.energy, match.state.time, match.state.energy);
  const fresh = match.events.slice(run.events.length);
  const chances = newChances(run, match);
  if (fresh.length === 0 && chances.length === 0) return;
  run.events.push(...fresh);
  run.chances.push(...chances);
  run.timeline = extendTimeline(run.timeline, fresh, chances);
};

/** Advances the engine until `done` holds or the engine stops at half-time or full time. */
const advanceUntil = (run: Run, match: ObservedMatch, done: () => boolean) => {
  pull(run, match);
  while (!done() && isPlaying(match.state.period)) {
    match.advanceTo(match.state.time + ENGINE_STEP_MATCH_SECONDS);
    pull(run, match);
  }
};

/**
 * A run at the start, or, with `at`, at that match time of a match already advanced to it. The
 * engine is advanced past `at` first, as live play has it (the timeline reaches the lookahead
 * beyond the clock), because the end of a timeline is provisional until the next action is known.
 */
const createRun = (match: ObservedMatch, mode: PlaybackMode, at?: number): Run => {
  const events = [...match.events];
  const chances = chancesOf(match.steps ?? []);
  const timeline = buildTimeline(events, mode, chances);
  const run: Run = {
    events,
    timeline,
    clock: 0,
    presented: advancePresented(INITIAL_PRESENTED, events, timeline, { clock: 0, matchTime: 0 }),
    energy: createEnergyTrack(),
    chances,
  };
  recordEnergy(run.energy, match.state.time, match.state.energy);
  if (at === undefined) return run;
  const covered = () =>
    run.timeline.matchEnd >= at &&
    run.timeline.duration >= run.timeline.presentationTimeAt(at) + LOOKAHEAD_SECONDS;
  advanceUntil(run, match, covered);
  run.clock =
    at < run.timeline.matchEnd ? run.timeline.presentationTimeAt(at) : run.timeline.duration;
  run.presented = advancePresented(INITIAL_PRESENTED, run.events, run.timeline, {
    clock: run.clock,
    matchTime: run.timeline.matchTimeAt(run.clock),
  });
  return run;
};

const viewOf = (run: Run): View => {
  const matchTime = run.timeline.matchTimeAt(run.clock);
  run.presented = advancePresented(run.presented, run.events, run.timeline, {
    clock: run.clock,
    matchTime,
  });
  return {
    matchTime,
    presented: run.presented,
    energy: energyAt(run.energy, matchTime),
    chance: chanceMomentAt(run.timeline, run.clock),
  };
};

/**
 * Drives a match from the wall clock through the playback director. The hook keeps a presentation
 * clock; `matchTime` is `timeline.matchTimeAt(clock)`. The engine runs ahead of the clock by
 * `LOOKAHEAD_SECONDS` of presentation time, so the timeline always covers the next moments, and the
 * timeline is extended as events arrive. The clock stops on its own at half-time and full time.
 * The score, period and event count the views see are those at the clock, never the engine's.
 */
export const useMatchPlayback = (
  match: ObservedMatch,
  tickMs: number = DEFAULT_TICK_MS,
  restored?: RestoredPlayback,
): MatchPlayback => {
  const [paused, setPaused] = useState(restored !== undefined);
  const [mode, chooseMode] = usePlaybackModeChoice(restored?.mode);
  const userChangesRef = useRef<TimedActionMatchChange[]>([...(restored?.changes ?? [])]);
  const [userChangeCount, setUserChangeCount] = useState(userChangesRef.current.length);
  const runRef = useRef<Run | null>(null);
  runRef.current ??= createRun(match, mode, restored?.matchTime);
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
    run.timeline = buildTimeline(run.events, next, run.chances);
    advanceUntil(run, match, () => run.timeline.matchEnd >= matchTime);
    run.clock = isPlaying(run.presented.period)
      ? run.timeline.presentationTimeAt(matchTime)
      : run.timeline.duration;
    setView(viewOf(run));
  };

  const applyChange = (change: ActionMatchChange): number | undefined => {
    const { period, time } = match.state;
    if (period === "fullTime" || !match.applyChange(change).ok) return undefined;
    recordEnergy(run.energy, time, match.state.energy);
    userChangesRef.current.push({ time, change });
    setUserChangeCount(userChangesRef.current.length);
    return time;
  };

  const resume = (change?: ActionMatchChange) => {
    if (match.state.period !== "halfTime") return;
    if (change) applyChange(change);
    match.resume();
    pull(run, match);
    setView(viewOf(run));
  };

  return {
    matchTime: view.matchTime,
    state: { period: view.presented.period, score: view.presented.score },
    events: run.events,
    eventCount: view.presented.eventCount,
    energy: view.energy,
    chance: view.chance,
    paused,
    mode,
    setPaused,
    setMode,
    applyChange,
    resume,
    userChanges: userChangesRef.current,
    userChangeCount,
  };
};
