import { type EnginePlayer, energyFactor, type Side } from "../../engine";
import { overallIn } from "../../game";
import { LOW_FITNESS } from "../plan-rows";
import type { Energy } from "./energy-track";
import type { SideLineup } from "./lineup-state";

/** A player on the pitch with less energy than this is tired: flagged with text and shape, and announced once. */
export const TIRED_ENERGY = LOW_FITNESS;

const FULL_ENERGY = 100;
const MATCH_RATING_FALLBACK = 6;

export type LineupStatus = "pitch" | "bench" | "off";

export type LineupRow = {
  id: string;
  name: string;
  side: Side;
  status: LineupStatus;
  position: EnginePlayer["position"];
  /** The rating (1 to 20) at the position played, with the attributes the engine uses at this energy. */
  rating: number;
  /** Energy 0 to 100, rounded. A player who has not played has full energy. */
  energy: number;
  tired: boolean;
  goals: number;
  /** The live match rating (1 to 10) from the events. */
  matchRating: number;
};

export type LineupRowsInput = {
  lineup: SideLineup;
  side: Side;
  energy: Energy;
  names: Readonly<Record<string, string>>;
  goals: Readonly<Record<string, number>>;
  matchRatings: Readonly<Record<string, number>>;
};

/** The rating at the position played with every attribute scaled the way the engine scales it at `energy`. */
const ratingAtEnergy = (player: EnginePlayer, energy: number): number => {
  const factor = energyFactor(energy);
  return overallIn(player.position, {
    ...player.attributes,
    ...Object.fromEntries(
      Object.entries(player.attributes).map(([name, value]) => [name, value * factor]),
    ),
  });
};

/** The rows of one side: the pitch in slot order, then the bench, then those substituted off. */
export const buildLineupRows = ({
  lineup,
  side,
  energy,
  names,
  goals,
  matchRatings,
}: LineupRowsInput): LineupRow[] => {
  const rowOf = (player: EnginePlayer, status: LineupStatus): LineupRow => {
    const level = energy[player.id] ?? FULL_ENERGY;
    return {
      id: player.id,
      name: names[player.id] ?? player.id,
      side,
      status,
      position: player.position,
      rating: ratingAtEnergy(player, level),
      energy: Math.round(level),
      tired: status === "pitch" && level < TIRED_ENERGY,
      goals: goals[player.id] ?? 0,
      matchRating: matchRatings[player.id] ?? MATCH_RATING_FALLBACK,
    };
  };
  return [
    ...lineup.onPitch.map((p) => rowOf(p, "pitch")),
    ...lineup.bench.map((p) => rowOf(p, "bench")),
    ...lineup.off.map((p) => rowOf(p, "off")),
  ];
};

/** Ids of the tired players on the pitch. */
export const tiredIds = (rows: readonly LineupRow[]): string[] =>
  rows.filter((row) => row.tired).map((row) => row.id);
