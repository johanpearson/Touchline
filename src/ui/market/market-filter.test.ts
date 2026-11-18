import { describe, expect, it } from "vitest";
import { careerInWindow } from "../test-career";
import { ALL_FILTERS, filterMarketRows, type MarketFilter } from "./market-filter";
import { playerRows } from "./market-rows";

const rows = playerRows(careerInWindow());
const filtered = (filter: Partial<MarketFilter>) =>
  filterMarketRows(rows, { ...ALL_FILTERS, ...filter });

describe("filterMarketRows", () => {
  it("keeps every row when nothing is filtered", () => {
    expect(filtered({})).toEqual(rows);
  });

  it("filters by position", () => {
    const result = filtered({ position: "GK" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((row) => row.player.position === "GK")).toBe(true);
  });

  it("filters by selling club", () => {
    const clubId = rows[0]?.clubId ?? "";
    const result = filtered({ clubId });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((row) => row.clubId === clubId)).toBe(true);
  });

  it("keeps players up to the maximum age, inclusive", () => {
    const result = filtered({ maxAge: 22 });
    expect(result.every((row) => row.player.age <= 22)).toBe(true);
    expect(result.length).toBe(rows.filter((row) => row.player.age <= 22).length);
  });

  it("keeps players up to the maximum value, inclusive", () => {
    const limit = rows[0]?.value ?? 0;
    const result = filtered({ maxValue: limit });
    expect(result.every((row) => row.value <= limit)).toBe(true);
    expect(result).toContain(rows[0]);
  });

  it("searches names without caring for case or accents", () => {
    const name = rows[0]?.player.name ?? "";
    const result = filtered({ query: `  ${name.toUpperCase()} ` });
    expect(result).toContain(rows[0]);
  });

  it("combines the filters", () => {
    const result = filtered({ position: "FWD", maxAge: 25 });
    expect(result.every((row) => row.player.position === "FWD" && row.player.age <= 25)).toBe(true);
  });
});
