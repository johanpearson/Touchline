import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { finishSeason } from "./finish-season";
import { playMatchdays } from "./season-test-helpers";
import { startNextSeason } from "./start-next-season";

describe("the off-season performance", () => {
  it("runs a full off-season for 14 clubs within the time budget", () => {
    // Budget: far below one simulated matchday (13 matches at about 50 ms each, see
    // "Performance and the fast path" in docs/architecture.md); here a whole off-season (summary,
    // development of about 340 players, retirement, renewals, youth, offers, AI squads) is allowed
    // two seconds, tripled for slow CI runners.
    const budgetMs = 2000 * 3;
    const finished = playMatchdays(aCareer(), 26);
    const start = performance.now();

    const opened = finishSeason(finished);
    if (!opened.ok) throw new Error(opened.error);
    const next = startNextSeason(opened.career);

    expect(performance.now() - start).toBeLessThan(budgetMs);
    expect(opened.career.window).toBe("open");
    // The user's squad may be illegal after his contracts end; the clubs of the AI are always legal.
    expect(next.ok || next.error === "squad-over-limit").toBe(true);
  }, 120_000);
});
