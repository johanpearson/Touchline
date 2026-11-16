import { describe, expect, it } from "vitest";
import {
  type Column,
  columnsForWidth,
  groupRows,
  nextSort,
  sortRows,
  WIDTH_ALL_COLUMNS,
  WIDTH_MEDIUM_COLUMNS,
} from "./data-table-logic";

type Row = { id: string; name: string; pts: number; group: string };

const col = (id: string, priority: 1 | 2 | 3, extra: Partial<Column<Row>> = {}): Column<Row> => ({
  id,
  header: id,
  cell: () => id,
  priority,
  ...extra,
});

const rows: Row[] = [
  { id: "a", name: "Örebro", pts: 10, group: "G" },
  { id: "b", name: "Zeta", pts: 12, group: "D" },
  { id: "c", name: "Åre", pts: 10, group: "G" },
  { id: "d", name: "Alba", pts: 3, group: "D" },
];

describe("columnsForWidth", () => {
  const columns = [col("p1", 1), col("p2", 2), col("p3", 3)];
  const ids = (width: number | null) => columnsForWidth(columns, width).map((c) => c.id);

  it("shows every column when wide or unmeasured", () => {
    expect(ids(WIDTH_ALL_COLUMNS)).toEqual(["p1", "p2", "p3"]);
    expect(ids(null)).toEqual(["p1", "p2", "p3"]);
  });

  it("hides priority 3 first, then priority 2", () => {
    expect(ids(WIDTH_ALL_COLUMNS - 1)).toEqual(["p1", "p2"]);
    expect(ids(WIDTH_MEDIUM_COLUMNS - 1)).toEqual(["p1"]);
  });

  it("never hides priority 1", () => {
    expect(ids(0)).toEqual(["p1"]);
  });
});

describe("sortRows", () => {
  const byName = col("name", 1, { sortValue: (r) => r.name });
  const byPts = col("pts", 1, { sortValue: (r) => r.pts });

  it("sorts numbers ascending and descending", () => {
    expect(sortRows(rows, byPts, "asc", "en").map((r) => r.id)).toEqual(["d", "a", "c", "b"]);
    expect(sortRows(rows, byPts, "desc", "en").map((r) => r.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("is stable for equal values", () => {
    const asc = sortRows(rows, byPts, "asc", "en").map((r) => r.id);
    expect(asc.indexOf("a")).toBeLessThan(asc.indexOf("c"));
    const desc = sortRows(rows, byPts, "desc", "en").map((r) => r.id);
    expect(desc.indexOf("a")).toBeLessThan(desc.indexOf("c"));
  });

  it("breaks ties with the given key, ascending regardless of direction", () => {
    const tie = (r: Row) => r.name;
    expect(sortRows(rows, byPts, "asc", "en", tie).map((r) => r.id)).toEqual(["d", "c", "a", "b"]);
    expect(sortRows(rows, byPts, "desc", "en", tie).map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("uses the locale's collation for text", () => {
    expect(sortRows(rows, byName, "asc", "sv").map((r) => r.name)).toEqual([
      "Alba",
      "Zeta",
      "Åre",
      "Örebro",
    ]);
    expect(sortRows(rows, byName, "asc", "en").map((r) => r.name)).toEqual([
      "Alba",
      "Åre",
      "Örebro",
      "Zeta",
    ]);
  });

  it("returns the rows unchanged for a column without a sort value", () => {
    expect(sortRows(rows, col("x", 1), "asc", "en")).toEqual(rows);
  });

  it("does not mutate its input", () => {
    const copy = [...rows];
    sortRows(rows, byPts, "asc", "en");
    expect(rows).toEqual(copy);
  });
});

describe("nextSort", () => {
  it("starts ascending, then toggles", () => {
    const first = nextSort(null, "pts");
    expect(first).toEqual({ id: "pts", direction: "asc" });
    const second = nextSort(first, "pts");
    expect(second).toEqual({ id: "pts", direction: "desc" });
    expect(nextSort(second, "pts")).toEqual({ id: "pts", direction: "asc" });
  });

  it("restarts ascending on another column", () => {
    expect(nextSort({ id: "pts", direction: "desc" }, "name")).toEqual({
      id: "name",
      direction: "asc",
    });
  });
});

describe("groupRows", () => {
  it("keeps one group when there is no grouping", () => {
    expect(groupRows(rows, undefined)).toEqual([{ key: null, rows }]);
  });

  it("groups in order of first appearance and keeps the row order inside", () => {
    const groups = groupRows(rows, (r) => r.group);
    expect(groups.map((g) => g.key)).toEqual(["G", "D"]);
    expect(groups[0]?.rows.map((r) => r.id)).toEqual(["a", "c"]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["b", "d"]);
  });
});
