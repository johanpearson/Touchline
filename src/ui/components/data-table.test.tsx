import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableProps } from "./data-table";
import type { Column } from "./data-table-logic";

type Row = { id: string; name: string; pts: number; pos: string; mine?: boolean };

const ROWS: Row[] = [
  { id: "1", name: "Örebro", pts: 10, pos: "MID" },
  { id: "2", name: "Zeta", pts: 12, pos: "GK", mine: true },
  { id: "3", name: "Åre", pts: 10, pos: "MID" },
  { id: "4", name: "Alba", pts: 3, pos: "GK" },
];

const COLUMNS: Column<Row>[] = [
  {
    id: "name",
    header: "Club",
    cell: (r) => r.name,
    sortValue: (r) => r.name,
    priority: 1,
    primary: true,
  },
  {
    id: "pos",
    header: "Position",
    cell: (r) => r.pos,
    priority: 3,
  },
  {
    id: "pts",
    header: "Points",
    cell: (r) => r.pts,
    sortValue: (r) => r.pts,
    align: "end",
    priority: 2,
  },
];

const LABELS = { sortBy: "Sort by", ascending: "ascending", descending: "descending" };

let resizeCallback: ResizeObserverCallback | null = null;

function setWidth(width: number) {
  act(() => {
    resizeCallback?.([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);
  });
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  resizeCallback = null;
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

function renderTable(props: Partial<DataTableProps<Row>> = {}) {
  return render(
    <DataTable
      label="League table"
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(r) => r.id}
      labels={LABELS}
      locale="en"
      {...props}
    />,
  );
}

const bodyNames = () =>
  within(screen.getAllByRole("rowgroup")[1] as HTMLElement)
    .getAllByRole("row")
    .map((row) => within(row).getAllByRole("cell")[0]?.textContent);

describe("DataTable semantics", () => {
  it("is a real table with a name and column headers with scope", () => {
    renderTable();
    expect(screen.getByRole("table", { name: "League table" })).toBeTruthy();
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header.getAttribute("scope")).toBe("col");
    }
    expect(screen.queryByRole("presentation")).toBeNull();
  });

  it("renders the empty node instead of a table without rows", () => {
    renderTable({ rows: [], empty: <p>No clubs yet</p> });
    expect(screen.getByText("No clubs yet")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("DataTable column priorities", () => {
  const headers = () => screen.getAllByRole("columnheader").map((h) => h.textContent);

  it("shows every column on a wide container", () => {
    renderTable();
    setWidth(1000);
    expect(headers()).toEqual(["Club", "Position", "Points"]);
  });

  it("hides priority 3 first on a medium container", () => {
    renderTable();
    setWidth(700);
    expect(headers()).toEqual(["Club", "Points"]);
  });

  it("keeps only priority 1 on a narrow container", () => {
    renderTable();
    setWidth(300);
    expect(headers()).toEqual(["Club"]);
  });
});

describe("DataTable sorting", () => {
  it("keeps the given order until a header is used and has no aria-sort", () => {
    renderTable();
    expect(bodyNames()).toEqual(["Örebro", "Zeta", "Åre", "Alba"]);
    for (const header of screen.getAllByRole("columnheader")) {
      expect(header.getAttribute("aria-sort")).toBeNull();
    }
  });

  it("sorts ascending, then descending, and reports it with aria-sort", () => {
    renderTable();
    const points = screen.getByRole("button", { name: /Points/ });
    fireEvent.click(points);
    expect(bodyNames()).toEqual(["Alba", "Örebro", "Åre", "Zeta"]);
    expect(screen.getByRole("columnheader", { name: /Points/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
    fireEvent.click(points);
    expect(bodyNames()).toEqual(["Zeta", "Örebro", "Åre", "Alba"]);
    expect(screen.getByRole("columnheader", { name: /Points/ }).getAttribute("aria-sort")).toBe(
      "descending",
    );
  });

  it("sorts names with the locale's collation", () => {
    renderTable({ locale: "sv" });
    fireEvent.click(screen.getByRole("button", { name: /Club/ }));
    expect(bodyNames()).toEqual(["Alba", "Zeta", "Åre", "Örebro"]);
  });

  it("breaks ties with the tie-break key", () => {
    renderTable({ tieBreak: (r) => r.name });
    fireEvent.click(screen.getByRole("button", { name: /Points/ }));
    expect(bodyNames()).toEqual(["Alba", "Åre", "Örebro", "Zeta"]);
  });

  it("starts from the default sort", () => {
    renderTable({ defaultSort: { id: "pts", direction: "desc" } });
    expect(bodyNames()).toEqual(["Zeta", "Örebro", "Åre", "Alba"]);
  });

  it("uses real buttons so Enter and Space work, only for sortable columns", () => {
    renderTable();
    expect(screen.getByRole("button", { name: /Club/ }).tagName).toBe("BUTTON");
    expect(screen.queryByRole("button", { name: /Position/ })).toBeNull();
  });
});

describe("DataTable density", () => {
  const cell = () => screen.getAllByRole("cell")[0] as HTMLElement;

  it("pads rows by 8 px when compact", () => {
    renderTable({ density: "compact" });
    expect(cell().className).toContain("py-2");
    expect(cell().className).not.toContain("min-h-11");
  });

  it("pads rows by 14 px and keeps 44 px targets when comfortable", () => {
    renderTable({ density: "comfortable" });
    expect(cell().className).toContain("py-3.5");
    expect(screen.getByRole("button", { name: /Club/ }).className).toContain("min-h-11");
  });
});

describe("DataTable rows", () => {
  it("marks the highlighted row and exposes the accent as a variable", () => {
    renderTable({ highlight: (r) => r.mine === true, accent: () => "var(--club-a)" });
    const row = screen.getByText("Zeta").closest("tr") as HTMLElement;
    expect(row.getAttribute("data-highlighted")).toBe("true");
    expect(row.style.getPropertyValue("--row-accent")).toBe("var(--club-a)");
    expect(screen.getByText("Alba").closest("tr")?.getAttribute("data-highlighted")).toBeNull();
  });

  it("shows group header rows in a fixed order and sorts inside each group", () => {
    renderTable({ groupBy: (r) => r.pos, groupLabel: (key) => `Group ${key}` });
    fireEvent.click(screen.getByRole("button", { name: /Points/ }));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => r.firstElementChild?.textContent)).toEqual([
      "Group MID",
      "Örebro",
      "Åre",
      "Group GK",
      "Alba",
      "Zeta",
    ]);
  });
});

describe("DataTable card mode", () => {
  const tableText = () => {
    const { container } = renderTable();
    setWidth(1000);
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    cleanup();
    return text;
  };

  it("lists one article per row with a heading", () => {
    renderTable({ cards: true });
    const items = screen.getAllByRole("article");
    expect(items).toHaveLength(ROWS.length);
    expect(within(items[0] as HTMLElement).getByRole("heading").textContent).toBe("Örebro");
    expect(screen.getByRole("list", { name: "League table" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the same data as the table", () => {
    const fromTable = tableText();
    const { container } = renderTable({ cards: true });
    const fromCards = (container.textContent ?? "").replace(/\s+/g, " ");
    for (const row of ROWS) {
      expect(fromTable).toContain(row.name);
      expect(fromCards).toContain(row.name);
    }
    for (const value of ["MID", "GK", "10", "12", "3", "Position", "Points"]) {
      expect(fromCards).toContain(value);
    }
  });

  it("is chosen by a phone-sized viewport", () => {
    mockMatchMedia(true);
    renderTable();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(ROWS.length);
  });

  it("offers sorting through a select above the list", () => {
    renderTable({ cards: true });
    expect(screen.getByRole("combobox", { name: "Sort by" })).toBeTruthy();
  });

  it("keeps cards at least 44 px high targets", () => {
    renderTable({ cards: true });
    expect(screen.getByRole("combobox", { name: "Sort by" }).className).toContain("min-h-11");
  });
});

describe("DataTable squad needs", () => {
  it("tells the caller when the sort changes", () => {
    const onSortChange = vi.fn();
    renderTable({ onSortChange });
    fireEvent.click(screen.getByRole("button", { name: /Points/ }));
    expect(onSortChange).toHaveBeenCalledWith({ id: "pts", direction: "asc" });
  });

  it("puts the row attributes on table rows and on cards", () => {
    const rowAttributes = (r: Row) => ({ "data-testid": `row-${r.id}`, "data-pos": r.pos });
    const { unmount } = renderTable({ rowAttributes });
    expect(screen.getByTestId("row-2").getAttribute("data-pos")).toBe("GK");
    expect(screen.getByTestId("row-2").tagName).toBe("TR");
    unmount();
    renderTable({ rowAttributes, cards: true });
    expect(screen.getByTestId("row-2").tagName).toBe("ARTICLE");
  });
});
