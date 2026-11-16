import {
  type Club,
  type ClubKits,
  clubStarPlayer,
  deriveClubLineRatings,
  kitsOf,
  type Player,
  type PlayerPosition,
} from "../../game";

export type Difficulty = "easy" | "normal" | "hard" | "veryHard";

/** How many of the strongest clubs are easy and how many of the weakest are very hard. */
export const EASY_CLUB_COUNT = 3;
export const VERY_HARD_CLUB_COUNT = 3;

/**
 * Placeholder budget range in millions. The game has no budgets before M6; the figure only
 * follows the rating rank so the card has something indicative to show. M6 replaces it.
 */
export const BUDGET_MAX_MILLIONS = 40;
export const BUDGET_MIN_MILLIONS = 4;

/**
 * The difficulty of managing the club at a rating rank (0 is the strongest of `count`): the top
 * three are easy, the bottom three very hard and the clubs between split into normal then hard.
 * Rank based, so it holds for any generated league size.
 */
export const difficultyForRank = (rank: number, count: number): Difficulty => {
  if (rank < EASY_CLUB_COUNT) return "easy";
  if (rank >= count - VERY_HARD_CLUB_COUNT) return "veryHard";
  const middle = count - EASY_CLUB_COUNT - VERY_HARD_CLUB_COUNT;
  return rank - EASY_CLUB_COUNT < Math.ceil(middle / 2) ? "normal" : "hard";
};

/** Indicative transfer budget in millions (whole half millions), falling linearly with the rank. */
export const indicativeBudget = (rank: number, count: number): number => {
  if (count <= 1) return BUDGET_MAX_MILLIONS;
  const share = rank / (count - 1);
  const millions = BUDGET_MAX_MILLIONS - (BUDGET_MAX_MILLIONS - BUDGET_MIN_MILLIONS) * share;
  return Math.round(millions * 2) / 2;
};

export type ClubCard = {
  club: Club;
  /** Place by rating in the league, 1 is the strongest. */
  rank: number;
  rating: number;
  attack: number;
  midfield: number;
  defence: number;
  difficulty: Difficulty;
  budgetMillions: number;
  star: { id: string; name: string; position: PlayerPosition } | null;
  kits: ClubKits;
};

/** One card per club, strongest first (the club name breaks ties so the order is deterministic). */
export const buildClubCards = (clubs: readonly Club[], players: readonly Player[]): ClubCard[] => {
  const rated = clubs
    .map((club) => ({ club, ratings: deriveClubLineRatings(club, players) }))
    .sort(
      (a, b) =>
        Math.round(b.ratings.overall) - Math.round(a.ratings.overall) ||
        a.club.name.localeCompare(b.club.name),
    );
  return rated.map(({ club, ratings }, index) => {
    const star = clubStarPlayer(club, players);
    return {
      club,
      rank: index + 1,
      rating: Math.round(ratings.overall),
      attack: Math.round(ratings.attack),
      midfield: Math.round(ratings.midfield),
      defence: Math.round(ratings.defence),
      difficulty: difficultyForRank(index, rated.length),
      budgetMillions: indicativeBudget(index, rated.length),
      star: star ? { id: star.id, name: star.name, position: star.position } : null,
      kits: kitsOf(club),
    };
  });
};
