import { describe, expect, it } from "vitest";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { computeTable } from "./compute-table";
import { playMatchdays } from "./season-test-helpers";
import { clubSquad } from "./squad-plan";

// Whole seasons for several seeds. Each season is 182 simulated matches, so these live in their own file:
// Vitest runs files in parallel, and the quick tests of complete-matchday.test.ts do not wait for them.
const playSeason = (start: Career): Career => playMatchdays(start, 26);

describe("completeMatchday over whole seasons", () => {
  it.each([1, 42, 2024])("completes a season with a consistent table for seed %i", (seed) => {
    const finished = playSeason(aCareer(seed));
    const ids = finished.league.clubs.map((c) => c.id);

    const table = computeTable(ids, finished.season.results);

    expect(table.ok).toBe(true);
    const rows = table.ok ? table.table : [];
    expect(rows.reduce((n, r) => n + r.goalsFor, 0)).toBe(
      rows.reduce((n, r) => n + r.goalsAgainst, 0),
    );
    expect(rows.every((r) => r.played === 26)).toBe(true);
  });

  it("rotates at least one AI club's eleven because of fatigue, always with a valid lineup", () => {
    for (const seed of [1, 2, 3]) {
      const career = aCareer(seed);
      const elevenOf = (c: Career, clubId: string) => {
        const club = c.league.clubs.find((x) => x.id === clubId);
        if (!club) throw new Error("club");
        const squad = clubSquad(club, c.league.players);
        return [...autoPickLineup(squad, "4-4-2", c.condition).starters].sort().join();
      };
      const aiIds = career.league.clubs.map((c) => c.id).filter((id) => id !== career.userClubId);
      const first = new Map(aiIds.map((id) => [id, elevenOf(career, id)]));
      let rotated = false;
      for (let day = 1; day <= 26; day++) {
        const played = playMatchdays(career, day);
        for (const id of aiIds) {
          if (elevenOf(played, id) !== first.get(id)) rotated = true;
        }
      }
      expect(rotated).toBe(true);
    }
    // Three full seasons on the action engine: slow on a shared CI runner.
  }, 240_000);
});
