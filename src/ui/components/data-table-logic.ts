import type { ReactNode } from "react";

export type ColumnPriority = 1 | 2 | 3;
export type SortDirection = "asc" | "desc";
export type SortState = { id: string; direction: SortDirection };
export type SortValue = string | number;

export type Column<Row> = {
  id: string;
  /** Already translated by the caller. */
  header: string;
  cell: (row: Row) => ReactNode;
  /** Makes the column sortable. Strings use the locale's collation, numbers compare numerically. */
  sortValue?: (row: Row) => SortValue;
  align?: "start" | "end" | "center";
  /** 1 is always shown, 3 is hidden first as the table narrows. */
  priority: ColumnPriority;
  /** Shown in the card header instead of as a label/value pair on phones. */
  primary?: boolean;
};

/** Container widths (px) at which columns of priority 3 and then 2 start to hide. */
export const WIDTH_ALL_COLUMNS = 900;
export const WIDTH_MEDIUM_COLUMNS = 640;

/** Hides low-priority columns as the table's own width shrinks. Priority 1 is never hidden. */
export function columnsForWidth<Row>(
  columns: readonly Column<Row>[],
  width: number | null,
): Column<Row>[] {
  const maxPriority =
    width === null || width >= WIDTH_ALL_COLUMNS ? 3 : width >= WIDTH_MEDIUM_COLUMNS ? 2 : 1;
  return columns.filter((column) => column.priority <= maxPriority);
}

function compareValues(a: SortValue, b: SortValue, collator: Intl.Collator): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/** Stable sort by one column. The tie-break key always sorts ascending. */
export function sortRows<Row>(
  rows: readonly Row[],
  column: Column<Row>,
  direction: SortDirection,
  locale: string | undefined,
  tieBreak?: (row: Row) => SortValue,
): Row[] {
  const { sortValue } = column;
  if (!sortValue) return [...rows];
  const collator = new Intl.Collator(locale);
  const sign = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = sign * compareValues(sortValue(a), sortValue(b), collator);
    if (primary !== 0 || !tieBreak) return primary;
    return compareValues(tieBreak(a), tieBreak(b), collator);
  });
}

/** First click sorts ascending, the next toggles; another column starts ascending. */
export function nextSort(current: SortState | null, id: string): SortState {
  if (current?.id === id) return { id, direction: current.direction === "asc" ? "desc" : "asc" };
  return { id, direction: "asc" };
}

export type RowGroup<Row> = { key: string | null; rows: Row[] };

/** Groups rows by key in order of first appearance. Without a key function everything is one group. */
export function groupRows<Row>(
  rows: readonly Row[],
  groupBy: ((row: Row) => string) | undefined,
): RowGroup<Row>[] {
  if (!groupBy) return [{ key: null, rows: [...rows] }];
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = groupBy(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([key, groupRowsList]) => ({ key, rows: groupRowsList }));
}
