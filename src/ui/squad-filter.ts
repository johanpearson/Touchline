import type { Player, PlayerPosition } from "../game";
import type { PlanRow } from "./plan-rows";

export type PositionFilter = "all" | PlayerPosition;

export const POSITION_FILTERS: readonly PositionFilter[] = ["all", "GK", "DEF", "MID", "FWD"];

/** Lowercase text without diacritics, so "ake" finds "Åke" and "zoe" finds "Zoë". */
export const normalizeText = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Rows of the chosen position line whose player name contains the query. */
export const filterRows = <Row extends PlanRow>(
  rows: readonly Row[],
  position: PositionFilter,
  query: string,
): Row[] => {
  const needle = normalizeText(query.trim());
  return rows.filter(
    (row) =>
      (position === "all" || row.player.position === position) &&
      (needle === "" || normalizeText(row.player.name).includes(needle)),
  );
};

export const averageAge = (players: readonly Player[]): number =>
  players.length === 0 ? 0 : players.reduce((sum, p) => sum + p.age, 0) / players.length;
