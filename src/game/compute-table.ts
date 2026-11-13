/** Plain data for one played match. */
export type Result = {
  fixtureId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
};

export type TableRow = {
  /** 1-based. */
  position: number;
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type TableError =
  | "duplicate-club-ids"
  | "unknown-club"
  | "club-plays-itself"
  | "duplicate-fixture-id";

export type TableResult = { ok: true; table: TableRow[] } | { ok: false; error: TableError };

export type Outcome = "W" | "D" | "L";

const WIN_POINTS = 3;
const DRAW_POINTS = 1;

type Row = Omit<TableRow, "position">;

const emptyRow = (clubId: string): Row => ({
  clubId,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  points: 0,
});

const record = (row: Row, goalsFor: number, goalsAgainst: number): Row => {
  const won = goalsFor > goalsAgainst;
  const drawn = goalsFor === goalsAgainst;
  return {
    ...row,
    played: row.played + 1,
    won: row.won + (won ? 1 : 0),
    drawn: row.drawn + (drawn ? 1 : 0),
    lost: row.lost + (!won && !drawn ? 1 : 0),
    goalsFor: row.goalsFor + goalsFor,
    goalsAgainst: row.goalsAgainst + goalsAgainst,
    goalDifference: row.goalDifference + goalsFor - goalsAgainst,
    points: row.points + (won ? WIN_POINTS : drawn ? DRAW_POINTS : 0),
  };
};

const validate = (clubIds: readonly string[], results: readonly Result[]): TableError | null => {
  const known = new Set(clubIds);
  if (known.size !== clubIds.length) return "duplicate-club-ids";
  const fixtureIds = new Set<string>();
  for (const r of results) {
    if (!known.has(r.homeClubId) || !known.has(r.awayClubId)) return "unknown-club";
    if (r.homeClubId === r.awayClubId) return "club-plays-itself";
    if (fixtureIds.has(r.fixtureId)) return "duplicate-fixture-id";
    fixtureIds.add(r.fixtureId);
  }
  return null;
};

const byOverall = (a: Row, b: Row): number =>
  b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;

/** Head-to-head points for each club, counting only matches among `groupIds`. */
const headToHeadPoints = (
  groupIds: ReadonlySet<string>,
  results: readonly Result[],
): Map<string, number> => {
  const points = new Map<string, number>([...groupIds].map((id) => [id, 0]));
  for (const r of results) {
    if (!groupIds.has(r.homeClubId) || !groupIds.has(r.awayClubId)) continue;
    const add = (id: string, value: number): void => {
      points.set(id, (points.get(id) ?? 0) + value);
    };
    if (r.homeGoals === r.awayGoals) {
      add(r.homeClubId, DRAW_POINTS);
      add(r.awayClubId, DRAW_POINTS);
    } else {
      add(r.homeGoals > r.awayGoals ? r.homeClubId : r.awayClubId, WIN_POINTS);
    }
  }
  return points;
};

const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Splits clubs level on points, difference and goals by head-to-head points, then by id. */
const breakTie = (group: Row[], results: readonly Result[]): Row[] => {
  if (group.length === 1) return group;
  const h2h = headToHeadPoints(new Set(group.map((r) => r.clubId)), results);
  return [...group].sort(
    (a, b) => (h2h.get(b.clubId) ?? 0) - (h2h.get(a.clubId) ?? 0) || compareIds(a.clubId, b.clubId),
  );
};

const sameOverall = (a: Row, b: Row): boolean => byOverall(a, b) === 0;

/**
 * Builds the league table. Order: points, goal difference, goals scored,
 * head-to-head points among the tied clubs, then club id (alphabetical).
 * The result does not depend on the order of `results`.
 */
export const computeTable = (
  clubIds: readonly string[],
  results: readonly Result[],
): TableResult => {
  const error = validate(clubIds, results);
  if (error) return { ok: false, error };

  const rows = new Map<string, Row>(clubIds.map((id) => [id, emptyRow(id)]));
  for (const r of results) {
    rows.set(r.homeClubId, record(rows.get(r.homeClubId) as Row, r.homeGoals, r.awayGoals));
    rows.set(r.awayClubId, record(rows.get(r.awayClubId) as Row, r.awayGoals, r.homeGoals));
  }

  const sorted = [...rows.values()].sort(byOverall);
  const ordered: Row[] = [];
  let group: Row[] = [];
  for (const row of sorted) {
    if (group.length > 0 && !sameOverall(group[0] as Row, row)) {
      ordered.push(...breakTie(group, results));
      group = [];
    }
    group.push(row);
  }
  ordered.push(...breakTie(group, results));

  return { ok: true, table: ordered.map((row, i) => ({ position: i + 1, ...row })) };
};

const outcomeFor = (clubId: string, r: Result): Outcome => {
  const [own, other] =
    r.homeClubId === clubId ? [r.homeGoals, r.awayGoals] : [r.awayGoals, r.homeGoals];
  return own > other ? "W" : own === other ? "D" : "L";
};

/** The club's last `n` outcomes, oldest first, in the order the results are given. */
export const computeForm = (clubId: string, results: readonly Result[], n = 5): Outcome[] =>
  results
    .filter((r) => r.homeClubId === clubId || r.awayClubId === clubId)
    .map((r) => outcomeFor(clubId, r))
    .slice(-n);
