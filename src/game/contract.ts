/** A player's contract: the wage per season and the last season it covers. Plain JSON. */
export type Contract = {
  /** Wage per season, integer thousands of the fictional euro. */
  wage: number;
  /** The contract ends after the final match of this season (1-based). */
  expiresSeason: number;
};

/** A club's money. Plain JSON, integer thousands of the fictional euro; the balance may be negative. */
export type ClubFinance = {
  balance: number;
  /** Income per season before the league prize. */
  baseIncome: number;
};
