import {
  ATTRIBUTE_NAMES,
  type AttributeName,
  type Player,
  type PlayerCondition,
  type PlayerPosition,
  playerOverall,
} from "../game";

export const POSITION_ORDER: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

export type SortColumn = "name" | "age" | "overall" | "fitness" | "form" | AttributeName;
export type SortState = { column: SortColumn; direction: "asc" | "desc" };

export type SquadRow = {
  player: Player;
  overall: number;
  fitness: number;
  form: number;
  inBestEleven: boolean;
};
export type SquadGroup = { position: PlayerPosition; rows: SquadRow[] };

export const DEFAULT_SORT: SortState = { column: "overall", direction: "desc" };

export const SORT_COLUMNS: readonly SortColumn[] = [
  "name",
  "age",
  "overall",
  "fitness",
  "form",
  ...ATTRIBUTE_NAMES,
];

const columnValue = (row: SquadRow, column: SortColumn): number | string => {
  if (column === "name") return row.player.name;
  if (column === "overall" || column === "fitness" || column === "form") return row[column];
  return row.player[column];
};

const compare = (a: SquadRow, b: SquadRow, { column, direction }: SortState): number => {
  const x = columnValue(a, column);
  const y = columnValue(b, column);
  const order = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
  const signed = direction === "asc" ? order : -order;
  return signed || (a.player.id < b.player.id ? -1 : 1);
};

/** Groups the squad by position (GK, DEF, MID, FWD) and sorts each group by the chosen column. */
export const groupSquad = (
  players: readonly Player[],
  bestEleven: ReadonlySet<string>,
  sort: SortState,
  condition: Readonly<Record<string, PlayerCondition>> = {},
): SquadGroup[] =>
  POSITION_ORDER.map((position) => ({
    position,
    rows: players
      .filter((p) => p.position === position)
      .map((player) => ({
        player,
        overall: playerOverall(player),
        fitness: condition[player.id]?.fitness ?? 100,
        form: condition[player.id]?.form ?? 5,
        inBestEleven: bestEleven.has(player.id),
      }))
      .sort((a, b) => compare(a, b, sort)),
  })).filter((group) => group.rows.length > 0);
