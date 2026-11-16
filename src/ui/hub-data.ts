import {
  type Career,
  computeForm,
  computeTable,
  type Player,
  type Result,
  type Season,
  type TableRow,
} from "../game";
import { clubRating } from "./club-rating";
import { LOW_FITNESS } from "./plan-rows";

const POINTS = { W: 3, D: 1, L: 0 } as const;
const FORM_MATCHES = 5;
const NEIGHBOURS = 3;

/** The number of matchdays in the season. */
export const roundCount = (season: Season): number =>
  season.fixtures.reduce((max, f) => Math.max(max, f.matchday), 0);

export type FormPoints = { points: number; played: number };

/** Points from the club's last five matches, and how many matches that is (fewer early on). */
export const lastFivePoints = (clubId: string, results: readonly Result[]): FormPoints => {
  const outcomes = computeForm(clubId, results, FORM_MATCHES);
  return { points: outcomes.reduce((sum, o) => sum + POINTS[o], 0), played: outcomes.length };
};

/** Goals scored per match played, or null before the club has played. */
export const goalsPerGame = (clubId: string, results: readonly Result[]): number | null => {
  const own = results.filter((r) => r.homeClubId === clubId || r.awayClubId === clubId);
  if (own.length === 0) return null;
  const goals = own.reduce(
    (sum, r) => sum + (r.homeClubId === clubId ? r.homeGoals : r.awayGoals),
    0,
  );
  return goals / own.length;
};

/**
 * The rows of the home screen's mini table: the user's club with three clubs above and three below
 * (seven rows; the window slides at either end, so a leader sees the top seven).
 */
export const miniTableRows = <Row extends { position: number; clubId: string }>(
  table: readonly Row[],
  userClubId: string,
): Row[] => {
  const size = NEIGHBOURS * 2 + 1;
  const index = Math.max(
    0,
    table.findIndex((row) => row.clubId === userClubId),
  );
  const start = Math.max(0, Math.min(index - NEIGHBOURS, table.length - size));
  return table.slice(start, start + size);
};

export type ClubComparison = {
  /** League position, or null before the first matchday. */
  position: number | null;
  form: FormPoints;
  rating: number;
  goalsPerGame: number | null;
};

const tableOf = (career: Career): TableRow[] => {
  const result = computeTable(
    career.league.clubs.map((club) => club.id),
    career.season.results,
  );
  return result.ok ? result.table : [];
};

/** The facts compared on the next-match card, all derived from the career. */
export const clubComparison = (career: Career, clubId: string): ClubComparison => {
  const { results } = career.season;
  const club = career.league.clubs.find((c) => c.id === clubId);
  const row = tableOf(career).find((r) => r.clubId === clubId);
  return {
    position: results.length > 0 ? (row?.position ?? null) : null,
    form: lastFivePoints(clubId, results),
    rating: club ? clubRating(club, career.league.players) : 0,
    goalsPerGame: goalsPerGame(clubId, results),
  };
};

export type LowFitnessPlayer = { player: Player; fitness: number };

export type HubSquadStatus = {
  /** Average fitness of the likely starting eleven, 0 to 100. */
  fitness: number;
  /** Average form of the likely starting eleven, 1 to 10. */
  form: number;
  /** Squad players below the low-fitness threshold, most tired first. */
  low: LowFitnessPlayer[];
};

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/** Fitness and form of the user's likely starting eleven, and the players who are too tired. */
export const hubSquadStatus = (career: Career): HubSquadStatus => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const squad = club ? career.league.players.filter((p) => club.playerIds.includes(p.id)) : [];
  const fitnessOf = (id: string) => career.condition[id]?.fitness ?? 100;
  const formOf = (id: string) => career.condition[id]?.form ?? 5;
  const starters = career.squadPlan.starters;
  return {
    fitness: mean(starters.map(fitnessOf)),
    form: mean(starters.map(formOf)),
    low: squad
      .map((player) => ({ player, fitness: fitnessOf(player.id) }))
      .filter((entry) => entry.fitness < LOW_FITNESS)
      .sort((a, b) => a.fitness - b.fitness || a.player.id.localeCompare(b.player.id)),
  };
};

/** The league table rows of the career (empty only if the stored results are inconsistent). */
export const careerTable = tableOf;
