import type { Period, Side } from "../match-state";
import { createRng } from "../rng";
import type { ActionEvent } from "./action-event";
import type { ActionMatch, ActionMatchState, TimedActionMatchChange } from "./action-match";
import {
  FIRST_HALF_ADDED_MINUTES,
  HALF_SECONDS,
  SECOND_HALF_ADDED_MINUTES,
  SECONDS_PER_MINUTE,
} from "./loop-constants";
import type { MatchInputV2 } from "./match-input-v2";
import { kickoffPlay, periodSnapshot, playAction } from "./play-action";
import type { PlayState } from "./play-state";

const otherSide = (side: Side): Side => (side === "home" ? "away" : "home");
const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Creates a deterministic action-engine match. Simulation draws from `fork("action-sim")`, snapshot
 * jitter from `fork("action-presentation")` and added time from its own `fork("addedTime")` (the
 * same minutes as the zone engine for a seed), so no stream depends on another. The same input and
 * seed give the same log however time is split across `advanceTo` calls.
 *
 * `applyChange` records changes but does not apply them yet: tactics come with the tactics issue
 * and substitutions with the changes issue of the epic.
 */
export const createActionMatch = (input: MatchInputV2, seed: number): ActionMatch => {
  const root = createRng(seed);
  const sim = root.fork("action-sim");
  const presentation = root.fork("action-presentation");
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
  let play: PlayState = kickoffPlay(firstKickoff, { home: 0, away: 0 });
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
    play = kickoffPlay(team, play.score);
    periodChange(time, "secondHalf");
    periodEnd = time + HALF_SECONDS + secondHalfAdded;
    act(time);
  };

  const applyChange = (change: TimedActionMatchChange["change"]): void => {
    if (period === "fullTime") return;
    changes.push({ time, change });
  };

  const state = (): ActionMatchState => ({
    time,
    period,
    possession: play.possession,
    ball: play.ball,
    score: { ...play.score },
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
