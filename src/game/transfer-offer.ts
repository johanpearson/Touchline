/** An offer from an AI club for one of the user's players. Plain JSON; kept in `Career.offers` for the window. */
export type TransferOffer = {
  id: string;
  fromClubId: string;
  playerId: string;
  /** Fee in thousands of the fictional euro. */
  fee: number;
};

/** `"open"` between the season summary and the next season, `"closed"` during the season (schema v7, additive). */
export type TransferWindow = "open" | "closed";
