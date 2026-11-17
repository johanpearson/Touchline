import type { Career } from "./career";
import type { Club } from "./club";

/** The AI clubs (every club but the user's) sorted by id, so results never depend on the order of `league.clubs`. */
export const aiClubsById = (career: Career): Club[] =>
  career.league.clubs
    .filter((club) => club.id !== career.userClubId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
