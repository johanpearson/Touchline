import type { ActionEvent } from "../action/action-event";
import type { Period, Side } from "../match-state";
import type { PerSide } from "../per-side";
import type { Chance } from "./chance";
import { CLEAR_CHANCE_XG } from "./chance-constants";
import type { PhaseStep } from "./phase-step";

/** A chance of one step with where and when it happened. */
export type StepChance = Chance & {
  /** The side that had the chance. */
  team: Side;
  period: Period;
  /** Match seconds when the possession ended, the moment of the shot. */
  time: number;
  /** Index of the step in the match's steps. */
  step: number;
  /** True from `CLEAR_CHANCE_XG` upwards. */
  clear: boolean;
};

/** The chance of every chance step, in order. Pure. */
export const chancesOf = (steps: readonly PhaseStep[]): StepChance[] =>
  steps.flatMap((step, index) =>
    step.outcome === "chance"
      ? [
          {
            ...step.chance,
            team: step.team,
            period: step.period,
            time: step.endTime,
            step: index,
            clear: step.chance.xg >= CLEAR_CHANCE_XG,
          },
        ]
      : [],
  );

/** The chance a shot event belongs to: the one of the same side and period at the shot's time (the step's end). Shared by the director and the commentary so both agree on what a chance is. */
export const chanceOfShot = (
  chances: readonly StepChance[],
  event: Pick<ActionEvent, "type" | "team" | "period" | "time">,
): StepChance | undefined =>
  event.type === "shot"
    ? chances.find(
        (c) => c.team === event.team && c.period === event.period && c.time === event.time,
      )
    : undefined;

/** A player's clear chances: created for a team mate, taken and missed (any result but a goal). */
export type BigChanceLine = { created: number; taken: number; missed: number };

export type BigChanceStats = {
  /** Keyed by player id; only players who created or took a clear chance have a line. */
  players: Record<string, BigChanceLine>;
  teams: PerSide<{ created: number; missed: number }>;
};

const lineOf = (players: Record<string, BigChanceLine>, id: string): BigChanceLine => {
  const line = players[id] ?? { created: 0, taken: 0, missed: 0 };
  players[id] = line;
  return line;
};

/** Clear chances created and missed per player and team. Pure. */
export const bigChanceStats = (steps: readonly PhaseStep[]): BigChanceStats => {
  const players: Record<string, BigChanceLine> = {};
  const teams: BigChanceStats["teams"] = {
    home: { created: 0, missed: 0 },
    away: { created: 0, missed: 0 },
  };
  for (const chance of chancesOf(steps)) {
    if (!chance.clear) continue;
    const missed = chance.result !== "goal";
    lineOf(players, chance.creator).created += 1;
    const taker = lineOf(players, chance.shooter);
    taker.taken += 1;
    if (missed) taker.missed += 1;
    teams[chance.team].created += 1;
    if (missed) teams[chance.team].missed += 1;
  }
  return { players, teams };
};
