import type { ActionPlayerLine, PerSide } from "../../engine";

type Side = keyof PerSide<unknown>;

export type RatingRow = {
  id: string;
  name: string;
  side: Side;
  rating: number;
  goals: number;
  keyPasses: number;
  shots: number;
  xg: number;
  /** Energy (0 to 100, rounded) the player ended the match with. */
  energy: number;
  playerOfTheMatch: boolean;
};

export type RatingRowsInput = {
  players: Readonly<Record<string, ActionPlayerLine>>;
  ratings: Readonly<Record<string, number>>;
  /** Ids of everyone who played, per side (starters and substitutes who came on). */
  played: PerSide<readonly string[]>;
  names: Readonly<Record<string, string>>;
  /** Energy at the end of the match by player id; a player not listed is at full energy. */
  energy?: Readonly<Record<string, number>>;
  userSide: Side;
};

const RATING_FALLBACK = 6;
const FULL_ENERGY = 100;

const byRatingThenId = (a: RatingRow, b: RatingRow): number =>
  b.rating - a.rating || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The rows of the full-time ratings table: the user's side first, each side sorted by rating (ties
 * by id), the best-rated player of the whole match marked as player of the match.
 */
export const buildRatingRows = ({
  players,
  ratings,
  played,
  names,
  energy = {},
  userSide,
}: RatingRowsInput): RatingRow[] => {
  const rowsOf = (side: Side): RatingRow[] =>
    played[side]
      .map((id) => ({
        id,
        name: names[id] ?? id,
        side,
        rating: ratings[id] ?? RATING_FALLBACK,
        goals: players[id]?.goals ?? 0,
        keyPasses: players[id]?.keyPasses ?? 0,
        shots: players[id]?.shots ?? 0,
        xg: players[id]?.xg ?? 0,
        energy: Math.round(energy[id] ?? FULL_ENERGY),
        playerOfTheMatch: false,
      }))
      .sort(byRatingThenId);
  const otherSide: Side = userSide === "home" ? "away" : "home";
  const rows = [...rowsOf(userSide), ...rowsOf(otherSide)];
  const best = [...rows].sort(byRatingThenId)[0];
  return rows.map((row) => ({ ...row, playerOfTheMatch: row === best }));
};
