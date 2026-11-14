import type { MatchChange, TimedMatchChange } from "./match-change";
import type { MatchEvent } from "./match-event";
import type { MatchInput } from "./match-input";
import type { MatchState, Side } from "./match-state";
import { createRng } from "./rng";
import { tacticsModifiers } from "./tactics";
import { resolveTransition } from "./transition";

/** A running match simulation. */
export type Match = {
  /** The ordered log of everything that has happened so far. */
  readonly events: readonly MatchEvent[];
  /** The state after the last `advanceTo` call. */
  readonly state: MatchState;
  /**
   * Simulates up to `seconds` of match time. Going back in time is ignored. Stops at half-time
   * and at full time: the match then stays in that period however far it is asked to advance.
   */
  advanceTo: (seconds: number) => void;
  /**
   * Applies new phase ratings and/or tactics to one side from the current match time. Consumes no
   * randomness. Ignored after full time. Only ever called between steps, because a step is atomic.
   */
  applyChange: (change: MatchChange) => void;
  /** Every applied change in order, with the match time it was applied at. */
  readonly changes: readonly TimedMatchChange[];
  /** Starts the second half after half-time, with a kickoff for the team that did not start the match. */
  resume: () => void;
};

const MIN_STEP_SECONDS = 5;
const STEP_SPREAD_SECONDS = 12;
const HALF_SECONDS = 2700;
const SECONDS_PER_MINUTE = 60;
const FIRST_HALF_ADDED_MINUTES = { min: 1, max: 4 };
const SECOND_HALF_ADDED_MINUTES = { min: 2, max: 6 };

const otherSide = (side: Side): Side => (side === "home" ? "away" : "home");

/**
 * Creates a deterministic match. The same `input` and `seed` always give the same event log,
 * however the time is split across `advanceTo` calls. Changes applied with `applyChange` at the
 * same moments are part of that reproducible input.
 */
export const createMatch = (initialInput: MatchInput, seed: number): Match => {
  let input = initialInput;
  const changes: TimedMatchChange[] = [];
  const rng = createRng(seed);
  const firstPossession: Side = rng.chance(0.5) ? "home" : "away";
  const centre = { x: 0.5, y: 0.5 };
  let state: MatchState = {
    time: 0,
    period: "firstHalf",
    possession: firstPossession,
    ball: centre,
    danger: 0,
    score: { home: 0, away: 0 },
  };
  const events: MatchEvent[] = [
    { type: "kickoff", time: 0, team: firstPossession, position: centre, intensity: 0.3 },
  ];
  // Added time comes from its own stream so it never depends on how play unfolds.
  const addedTimeRng = rng.fork("addedTime");
  const addedSeconds = (range: { min: number; max: number }) =>
    addedTimeRng.int(range.min, range.max) * SECONDS_PER_MINUTE;
  let periodEnd = HALF_SECONDS + addedSeconds(FIRST_HALF_ADDED_MINUTES);
  const secondHalfAdded = addedSeconds(SECOND_HALF_ADDED_MINUTES);
  const stepDelayOf = (side: Side) =>
    tacticsModifiers(side === "home" ? input.homeTactics : input.awayTactics).stepDelay;
  const nextStepDelay = (side: Side) =>
    (MIN_STEP_SECONDS + rng.next() * STEP_SPREAD_SECONDS) * stepDelayOf(side);
  let nextStepAt = nextStepDelay(firstPossession);

  const isPlaying = () => state.period === "firstHalf" || state.period === "secondHalf";

  const endPeriod = (period: "halfTime" | "fullTime"): void => {
    state = { ...state, time: periodEnd, period };
    events.push({
      type: "periodChange",
      period,
      time: periodEnd,
      team: state.possession,
      position: state.ball,
      intensity: 0,
    });
  };

  const advanceTo = (seconds: number): void => {
    if (!Number.isFinite(seconds)) throw new RangeError(`Invalid match time: ${seconds}`);
    if (!isPlaying()) return;
    const target = Math.min(seconds, periodEnd);
    while (nextStepAt <= target) {
      const transition = resolveTransition({ ...state, time: nextStepAt }, input, rng);
      state = transition.state;
      events.push(...transition.events);
      nextStepAt += nextStepDelay(state.possession);
    }
    state = { ...state, time: Math.max(state.time, target) };
    if (target === periodEnd) endPeriod(state.period === "firstHalf" ? "halfTime" : "fullTime");
  };

  const applyChange = (change: MatchChange): void => {
    if (state.period === "fullTime") return;
    const key = change.side === "home" ? "home" : "away";
    const tacticsKey = change.side === "home" ? "homeTactics" : "awayTactics";
    input = {
      ...input,
      [key]: change.profile ?? input[key],
      [tacticsKey]: change.tactics ?? input[tacticsKey],
    };
    changes.push({ time: state.time, change });
  };

  const resume = (): void => {
    if (state.period !== "halfTime") throw new Error(`Cannot resume from ${state.period}`);
    const team = otherSide(firstPossession);
    const time = state.time;
    events.push({
      type: "periodChange",
      period: "secondHalf",
      time,
      team,
      position: centre,
      intensity: 0,
    });
    events.push({ type: "kickoff", time, team, position: centre, intensity: 0.3 });
    state = { ...state, period: "secondHalf", possession: team, ball: centre, danger: 0 };
    periodEnd = time + HALF_SECONDS + secondHalfAdded;
    nextStepAt = time + nextStepDelay(team);
  };

  return {
    get events() {
      return events;
    },
    get state() {
      return state;
    },
    get changes() {
      return changes;
    },
    advanceTo,
    applyChange,
    resume,
  };
};
