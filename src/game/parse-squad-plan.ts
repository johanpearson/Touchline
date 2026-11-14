import type { TeamTactics } from "../engine";
import { FORMATIONS, type Formation } from "./formation";
import { isRecord, isStringArray } from "./json-guards";
import { validateLineup } from "./lineup";
import type { Player } from "./player";
import {
  FITNESS_MAX,
  FITNESS_MIN,
  FORM_MAX,
  FORM_MIN,
  type PlayerCondition,
} from "./player-condition";
import type { SquadPlan } from "./squad-plan";

const TACTIC_LEVELS = {
  mentality: ["defensive", "balanced", "attacking"],
  pressing: ["low", "medium", "high"],
  width: ["narrow", "normal", "wide"],
  tempo: ["slow", "normal", "fast"],
} as const;

const parseTactics = (raw: unknown): TeamTactics | undefined => {
  if (!isRecord(raw)) return undefined;
  const { mentality, pressing, width, tempo } = raw;
  const ok =
    TACTIC_LEVELS.mentality.some((v) => v === mentality) &&
    TACTIC_LEVELS.pressing.some((v) => v === pressing) &&
    TACTIC_LEVELS.width.some((v) => v === width) &&
    TACTIC_LEVELS.tempo.some((v) => v === tempo);
  return ok ? ({ mentality, pressing, width, tempo } as TeamTactics) : undefined;
};

/** Validates a squad plan against the user's squad and returns a fresh copy, or `undefined`. */
export const parseSquadPlan = (raw: unknown, squad: readonly Player[]): SquadPlan | undefined => {
  if (!isRecord(raw) || !isStringArray(raw.starters) || !isStringArray(raw.bench)) return undefined;
  if (!FORMATIONS.some((f) => f === raw.formation)) return undefined;
  const tactics = parseTactics(raw.tactics);
  if (!tactics) return undefined;
  const lineup = {
    formation: raw.formation as Formation,
    starters: [...raw.starters],
    bench: [...raw.bench],
  };
  return validateLineup(lineup, squad).ok ? { ...lineup, tactics } : undefined;
};

const isInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const parseOneCondition = (raw: unknown): PlayerCondition | undefined => {
  if (!isRecord(raw)) return undefined;
  const { fitness, form } = raw;
  if (!isInRange(fitness, FITNESS_MIN, FITNESS_MAX) || !isInRange(form, FORM_MIN, FORM_MAX)) {
    return undefined;
  }
  return { fitness, form };
};

/** Validates the condition record: exactly one valid entry per league player. */
export const parseCondition = (
  raw: unknown,
  players: readonly Player[],
): Record<string, PlayerCondition> | undefined => {
  if (!isRecord(raw) || Object.keys(raw).length !== players.length) return undefined;
  const out: Record<string, PlayerCondition> = {};
  for (const player of players) {
    const parsed = parseOneCondition(raw[player.id]);
    if (!parsed) return undefined;
    out[player.id] = parsed;
  }
  return out;
};
