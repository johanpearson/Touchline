import { describe, expect, it } from "vitest";
import { computeForm, computeTable } from "../game";
import { leagueRows } from "./league-rows";
import { careerAfter } from "./test-career";

describe("leagueRows", () => {
  it("has one row per club in computeTable order with the table's numbers", () => {
    const career = careerAfter(2);
    const expected = computeTable(
      career.league.clubs.map((c) => c.id),
      career.season.results,
    );
    if (!expected.ok) throw new Error("table");
    const rows = leagueRows(career);
    expect(rows).toHaveLength(14);
    expect(rows.map(({ club, form, ...row }) => row)).toEqual(expected.table);
  });

  it("carries each club and its last five outcomes", () => {
    const career = careerAfter(6);
    for (const row of leagueRows(career)) {
      expect(row.club.id).toBe(row.clubId);
      expect(row.form).toEqual(computeForm(row.clubId, career.season.results));
      expect(row.form.length).toBeLessThanOrEqual(5);
    }
  });
});
