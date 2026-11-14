import type { Period, Side } from "../match-state";
import { createRng } from "../rng";
import type { ActionEvent } from "./action-event";
import type {
  ActionMatch,
  ActionMatchChange,
  ActionMatchOptions,
  ActionMatchState,
  TimedActionMatchChange,
} from "./action-match";
import { applyChangeToInput } from "./apply-change-to-input";
import {
  FIRST_HALF_ADDED_MINUTES,
  HALF_SECONDS,
  SECOND_HALF_ADDED_MINUTES,
  SECONDS_PER_MINUTE,
} from "./loop-constants";
import type { MatchInputV2 } from "./match-input-v2";
import { kickoffPlay, periodSnapshot, playAction } from "./play-action";
import type { PlayState } from "./play-state";
import type { MatchInputValidation } from "./validate-match-input-v2";

const otherSide = (side: Side): Side => (side === "home" ? "away" : "home");
const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Creates a deterministic action-engine match. Simulation draws from `fork("action-sim")`, snapshot
 * jitter from `fork("action-presentation")` and added time from its own `fork("addedTime")` (the
 * same minutes as the zone engine for a seed), so no stream depends on another. The same input and
 * seed give the same log however time is split across `advanceTo` calls.
 *
 * `applyChange` swaps a side's starters and/or tactics from the next action; it consumes no
 * randomness, so changes applied at the same moments are part of the reproducible input.
 */
export const createActionMatch = (
  initialInput: MatchInputV2,
  seed: number,
  options: ActionMatchOptions = {},
): ActionMatch => {
  const withSnapshots = (options.detail ?? "full") === "full";
  let input = initialInput;
  const root = createRng(seed);
  const sim = root.fork("action-sim");
  const presentation = withSnapshots ? root.fork("action-presentation") : undefined;
  const addedTimeRng = root.fork("addedTime");
  const addedSeconds = (range: { min: number; max: number }) =>
    addedTimeRng.int(range.min, range.max) * SECONDS_PER_MINUTE;

  const firstKickoff: Side = sim.chance(0.5) ? "home" : "away";
  const events: ActionEvent[] = [];
  const changes: TimedActionMatchChange[] = [];
  let period: Period = "firstHalf";
  let time = 0;
  let periodEnd = HALF_SECONDS + addedSeconds(FIRST_HALF_ADDED_MINUTES);
  const secondHalfAdded = addedSeconds(SECOND_HALF_ADDED_MINUTES);
  let play: PlayState = kickoffPlay(firstKickoff, { home: 0, away: 0 }, { home: 0, away: 0 });
  let nextActionAt = 0;

  const act = (at: number): void => {
    const result = playAction({
      input,
      play,
      time: at,
      period,
      sim,
      presentation,
      previous: events.at(-1),
    });
    if (result.replacedPrevious !== undefined) events[events.length - 1] = result.replacedPrevious;
    events.push(...result.events);
    play = result.play;
    nextActionAt = round1(at + result.duration);
  };

  const periodChange = (at: number, newPeriod: Period): void => {
    period = newPeriod;
    events.push({
      type: "periodChange",
      time: at,
      period: newPeriod,
      team: play.possession,
      from: play.ball,
      to: play.ball,
      pressure: 0,
      snapshot: periodSnapshot({ input, play, presentation }),
    });
  };

  const isPlaying = () => period === "firstHalf" || period === "secondHalf";

  act(0);

  const advanceTo = (seconds: number): void => {
    if (!Number.isFinite(seconds)) throw new RangeError(`Invalid match time: ${seconds}`);
    if (!isPlaying()) return;
    const target = Math.min(seconds, periodEnd);
    while (nextActionAt < target || (nextActionAt === target && target < periodEnd)) {
      act(nextActionAt);
    }
    time = Math.max(time, target);
    if (target === periodEnd) {
      periodChange(periodEnd, period === "firstHalf" ? "halfTime" : "fullTime");
    }
  };

  const resume = (): void => {
    if (period !== "halfTime") throw new Error(`Cannot resume from ${period}`);
    const team = otherSide(firstKickoff);
    play = kickoffPlay(team, play.score, play.fouls);
    periodChange(time, "secondHalf");
    periodEnd = time + HALF_SECONDS + secondHalfAdded;
    act(time);
  };

  const applyChange = (change: ActionMatchChange): MatchInputValidation => {
    if (change.side !== "home" && change.side !== "away") {
      throw new RangeError(`Invalid side: ${String(change.side)}`);
    }
    if (period === "fullTime") return { ok: true };
    const result = applyChangeToInput(input, change);
    if (!result.ok) return result;
    input = result.input;
    changes.push({ time, change });
    return { ok: true };
  };

  const state = (): ActionMatchState => ({
    time,
    period,
    possession: play.possession,
    ball: play.ball,
    score: { ...play.score },
    fouls: { ...play.fouls },
  });

  return {
    get events() {
      return events;
    },
    get state() {
      return state();
    },
    get changes() {
      return changes;
    },
    advanceTo,
    applyChange,
    resume,
  };
};
