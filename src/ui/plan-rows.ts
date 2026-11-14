import {
  type Player,
  type PlayerCondition,
  type PlayerPosition,
  playerOverall,
  type SquadPlan,
} from "../game";

export type PlanStatus = "starter" | "bench" | "out";
export type PlanSortColumn = "name" | "position" | "overall" | "fitness" | "form" | "status";
export type PlanSort = { column: PlanSortColumn; direction: "asc" | "desc" };
export type PlanRow = {
  player: Player;
  overall: number;
  fitness: number;
  form: number;
  status: PlanStatus;
};

/** Fitness below this is shown with a warning (always together with the number). */
export const LOW_FITNESS = 50;

export const PLAN_SORT_COLUMNS: readonly PlanSortColumn[] = [
  "name",
  "position",
  "overall",
  "fitness",
  "form",
  "status",
];

export const DEFAULT_PLAN_SORT: PlanSort = { column: "status", direction: "asc" };

const POSITION_RANK: Record<PlayerPosition, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
const STATUS_RANK: Record<PlanStatus, number> = { starter: 0, bench: 1, out: 2 };

const statusOf = (plan: SquadPlan, id: string): PlanStatus =>
  plan.starters.includes(id) ? "starter" : plan.bench.includes(id) ? "bench" : "out";

const value = (row: PlanRow, column: PlanSortColumn): number | string => {
  switch (column) {
    case "name":
      return row.player.name;
    case "position":
      return POSITION_RANK[row.player.position];
    case "status":
      return STATUS_RANK[row.status];
    default:
      return row[column];
  }
};

/** Direction a column starts with when first chosen: text and rank columns ascend. */
export const firstDirection = (column: PlanSortColumn): "asc" | "desc" =>
  column === "overall" || column === "fitness" || column === "form" ? "desc" : "asc";

/** All squad players with their status and condition, sorted; ties break by position, then id. */
export const planRows = (
  players: readonly Player[],
  plan: SquadPlan,
  condition: Readonly<Record<string, PlayerCondition>>,
  sort: PlanSort,
): PlanRow[] =>
  players
    .map((player) => ({
      player,
      overall: playerOverall(player),
      fitness: condition[player.id]?.fitness ?? 100,
      form: condition[player.id]?.form ?? 5,
      status: statusOf(plan, player.id),
    }))
    .sort((a, b) => {
      const x = value(a, sort.column);
      const y = value(b, sort.column);
      const order = typeof x === "string" ? x.localeCompare(y as string) : x - (y as number);
      const signed = sort.direction === "asc" ? order : -order;
      return (
        signed ||
        POSITION_RANK[a.player.position] - POSITION_RANK[b.player.position] ||
        (a.player.id < b.player.id ? -1 : 1)
      );
    });
