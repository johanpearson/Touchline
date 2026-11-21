import { rating } from "../action/attribute-rating";
import type { EngineAttributeName, EnginePlayer, EnginePosition } from "../action/engine-player";
import { homeEdge } from "../action/home-advantage";
import { actionTactics } from "../action/tactics-parameters";
import type { TeamSheet } from "../action/team-sheet";
import type { Side } from "../match-state";
import type { PerSide } from "../per-side";
import {
  DIRECTNESS_GAIN,
  HOME_EDGE_GAIN,
  RISK_BUILD_UP_PENALTY,
  SET_PIECE_BONUS,
  SHOT_WEIGHT_GAIN,
  SPACE_BEHIND_GAIN,
  STAGE_BASE,
  STAGE_GAIN,
  STAGE_MAX,
  STAGE_MIN,
  type Stage,
  TURNOVER_BONUS_GAIN,
} from "./phase-constants";
import type { PhaseStart } from "./phase-step";

type Group = { positions: readonly EnginePosition[]; attributes: readonly EngineAttributeName[] };

const average = (values: readonly number[]): number =>
  values.length === 0 ? 0.5 : values.reduce((sum, v) => sum + v, 0) / values.length;

const groupStrength = (starters: readonly EnginePlayer[], group: Group): number =>
  average(
    starters
      .filter((p) => group.positions.includes(p.position))
      .flatMap((p) => group.attributes.map((name) => rating(p, name))),
  );

/** Who attacks and who defends in each stage, and with which attributes. */
const ATTACK: readonly [Group, Group, Group] = [
  { positions: ["DEF", "MID"], attributes: ["passing", "ballControl", "vision"] },
  { positions: ["MID", "FWD"], attributes: ["passing", "dribbling", "vision", "pace"] },
  { positions: ["MID", "FWD"], attributes: ["finishing", "dribbling", "vision", "ballControl"] },
];
const DEFENCE: readonly [Group, Group, Group] = [
  { positions: ["MID", "FWD"], attributes: ["workRate", "tackling", "positioning"] },
  { positions: ["DEF", "MID"], attributes: ["tackling", "positioning", "strength"] },
  { positions: ["DEF"], attributes: ["tackling", "positioning", "strength"] },
];
const KEEPER: Group = { positions: ["GK"], attributes: ["handling", "reflexes", "positioning"] };
const KEEPER_SHARE = 0.25;

const defenceStrength = (sheet: TeamSheet, stage: Stage): number => {
  const line = groupStrength(sheet.starters, DEFENCE[stage]);
  if (stage < 2) return line;
  return (1 - KEEPER_SHARE) * line + KEEPER_SHARE * groupStrength(sheet.starters, KEEPER);
};

const isCounter = (start: PhaseStart): boolean => start === "tackle" || start === "interception";

/** Added to the stage chance by the tactics of both sides (the press acts in build-up and progression); neutral tactics add 0. */
const tacticsEffect = (
  stage: Stage,
  attack: TeamSheet,
  defence: TeamSheet,
  start: PhaseStart,
): number => {
  const mine = actionTactics(attack.tactics);
  const theirs = actionTactics(defence.tactics);
  const press = stage === 2 ? 0 : theirs.turnoverBonus * TURNOVER_BONUS_GAIN;
  if (stage === 0) {
    return mine.passSuccess - (mine.risk - 1) * RISK_BUILD_UP_PENALTY - press;
  }
  const direct = mine.directness * DIRECTNESS_GAIN - press;
  const counter = isCounter(start) ? Math.log(theirs.spaceBehind) * SPACE_BEHIND_GAIN : 0;
  const shots = stage === 2 ? (mine.shotWeight - 1) * SHOT_WEIGHT_GAIN : 0;
  return direct + counter + shots;
};

/**
 * The chance that the attack of `team` gets through `stage`: the base chance plus the gain times
 * the attack's strength over the defence's, the tactics of both sides, the home edge and, for a set
 * piece, a bonus in the final third. Pure.
 */
export const stageChance = (
  sheets: PerSide<TeamSheet>,
  team: Side,
  stage: Stage,
  start: PhaseStart,
): number => {
  const defending: Side = team === "home" ? "away" : "home";
  const attack = sheets[team];
  const defence = sheets[defending];
  const edge = (homeEdge(team) - homeEdge(defending)) * HOME_EDGE_GAIN;
  const strength = groupStrength(attack.starters, ATTACK[stage]) - defenceStrength(defence, stage);
  const set = start === "corner" || start === "freeKick" ? SET_PIECE_BONUS[stage] : 0;
  const chance =
    STAGE_BASE[stage] +
    STAGE_GAIN * strength +
    tacticsEffect(stage, attack, defence, start) +
    edge +
    set;
  return Math.min(STAGE_MAX, Math.max(STAGE_MIN, chance));
};
