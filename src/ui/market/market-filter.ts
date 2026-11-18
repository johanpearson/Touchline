import type { PlayerPosition } from "../../game";
import { normalizeText } from "../squad-filter";
import type { MarketRow } from "./market-rows";

export type MarketFilter = {
  position: PlayerPosition | "all";
  /** A selling club id, or "all". */
  clubId: string;
  /** The oldest age shown, or null for any age. */
  maxAge: number | null;
  /** The highest value shown, in thousands, or null for any value. */
  maxValue: number | null;
  query: string;
};

export const ALL_FILTERS: MarketFilter = {
  position: "all",
  clubId: "all",
  maxAge: null,
  maxValue: null,
  query: "",
};

/** The rows that pass every filter; an empty filter keeps all rows. */
export const filterMarketRows = (rows: readonly MarketRow[], filter: MarketFilter): MarketRow[] => {
  const needle = normalizeText(filter.query.trim());
  return rows.filter(
    (row) =>
      (filter.position === "all" || row.player.position === filter.position) &&
      (filter.clubId === "all" || row.clubId === filter.clubId) &&
      (filter.maxAge === null || row.player.age <= filter.maxAge) &&
      (filter.maxValue === null || row.value <= filter.maxValue) &&
      (needle === "" || normalizeText(row.player.name).includes(needle)),
  );
};

/** Reads a number from an input; empty or invalid text means "no limit". */
export const limitFromText = (text: string): number | null => {
  const value = Number.parseInt(text.trim(), 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
};
