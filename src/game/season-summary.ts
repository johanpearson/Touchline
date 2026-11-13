import type { TableRow } from "./compute-table";

/** A goal scorer's season tally. */
export type TopScorer = {
  name: string;
  clubId: string;
  goals: number;
};

/** What a finished season leaves behind. Plain JSON-serialisable data. */
export type SeasonSummary = {
  seasonNumber: number;
  championId: string;
  finalTable: TableRow[];
  /** 1-based final position of the user's club. */
  userPosition: number;
  userRecord: TableRow;
  /** The five best scorers, most goals first. */
  topScorers: TopScorer[];
};

export type SeasonError = "season-incomplete";

export type SummaryResult =
  | { ok: true; summary: SeasonSummary }
  | { ok: false; error: SeasonError };
