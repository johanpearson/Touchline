import { type Club, deriveClubLineRatings, type Player } from "../game";

/** A club's overall rating from 0 to 100: the mean overall of its best eleven (4-4-2) at full condition. */
export const clubRating = (club: Club, players: readonly Player[]): number =>
  Math.round(deriveClubLineRatings(club, players).overall);
