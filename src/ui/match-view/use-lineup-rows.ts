import { useMemo } from "react";
import type {
  ActionEvent,
  ActionStats,
  MatchInput,
  PerSide,
  TimedActionMatchChange,
} from "../../engine";
import { playerRatings } from "../../engine";
import type { Energy } from "./energy-track";
import { buildLineupRows, type LineupRow } from "./lineup-rows";
import { lineupAt } from "./lineup-state";

type Input = {
  input: MatchInput;
  /** The changes the engine applied; appended to in place, so the clock and the event count say when to look. */
  changes: readonly TimedActionMatchChange[];
  events: readonly ActionEvent[];
  eventCount: number;
  matchTime: number;
  energy: Energy;
  stats: ActionStats;
  names: Readonly<Record<string, string>>;
};

const SIDES = ["home", "away"] as const;

/**
 * The lineup rows of both sides at the director's clock: who is on the pitch, on the bench and
 * substituted off, with the rating at the energy shown and the live match rating. Everything is read
 * at the clock (changes up to `matchTime`, the first `eventCount` events, the presented energy).
 */
export const useLineupRows = (data: Input): PerSide<LineupRow[]> => {
  const { input, changes, events, eventCount, matchTime, energy, stats, names } = data;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` and `changes` are appended to in place; the count and the clock say when
  return useMemo(() => {
    const lineups = lineupAt(input, changes, matchTime);
    const everyone = SIDES.flatMap((side) =>
      [...lineups[side].onPitch, ...lineups[side].bench, ...lineups[side].off].map((p) => ({
        id: p.id,
      })),
    );
    const matchRatings = playerRatings(events.slice(0, eventCount), everyone);
    const goals = Object.fromEntries(
      Object.entries(stats.players).map(([id, line]) => [id, line.goals]),
    );
    const rowsOf = (side: "home" | "away") =>
      buildLineupRows({ lineup: lineups[side], side, energy, names, goals, matchRatings });
    return { home: rowsOf("home"), away: rowsOf("away") };
  }, [input, eventCount, matchTime, energy, stats, names]);
};
