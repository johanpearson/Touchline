import { describe, expect, it } from "vitest";
import type { Career } from "../../game";
import { careerInOffSeason } from "../test-career";
import { MOVERS_SHOWN, type Mover, offSeasonReview } from "./off-season-review";

const career = careerInOffSeason();

const squadIds = (c: Career): Set<string> =>
  new Set(c.league.clubs.find((club) => club.id === c.userClubId)?.playerIds);

/** True when the movers go by size of change (either direction), ties by name. */
const isOrdered = (movers: readonly Mover[]): boolean =>
  movers.every((m, i) => {
    const prev = movers[i - 1];
    if (!prev) return true;
    const step = Math.abs(prev.delta) - Math.abs(m.delta);
    return step > 0 || (step === 0 && prev.player.name < m.player.name);
  });

describe("offSeasonReview", () => {
  it("lists risers by biggest gain first, ties by name", () => {
    const { risers } = offSeasonReview(career);

    expect(risers.every((m) => m.delta > 0)).toBe(true);
    expect(isOrdered(risers)).toBe(true);
    expect(risers.length).toBeLessThanOrEqual(MOVERS_SHOWN);
  });

  it("lists fallers by biggest loss first, ties by name", () => {
    const { fallers } = offSeasonReview(career);

    expect(fallers.every((m) => m.delta < 0)).toBe(true);
    expect(isOrdered(fallers)).toBe(true);
  });

  it("shows only players of the user's squad, with the overall before and after the development", () => {
    const review = offSeasonReview(career);

    const ids = squadIds(career);
    for (const m of [...review.risers, ...review.fallers]) {
      expect(ids.has(m.player.id)).toBe(true);
      expect(m.after - m.before).toBeCloseTo(m.delta, 10);
    }
    expect(review.risers.length + review.fallers.length).toBeGreaterThan(0);
  });

  it("lists exactly the three youth players who joined the user's club at the rollover", () => {
    const review = offSeasonReview(career);

    expect(review.youth).toHaveLength(3);
    expect(review.youth.every((p) => p.id.startsWith(`${career.userClubId}-y1-`))).toBe(true);
    expect(review.youth.every((p) => p.age >= 16 && p.age <= 18)).toBe(true);
  });

  it("takes retirements and the season's money from the rollover record, with the current balance", () => {
    const review = offSeasonReview(career);

    expect(review.retired).toEqual(career.lastRollover?.retired);
    expect(review.money).toEqual({
      income: career.lastRollover?.income,
      wages: career.lastRollover?.wages,
      balance: career.finances[career.userClubId]?.balance,
    });
  });

  it("shows no money and nothing else from a career without a rollover record or development", () => {
    const bare: Career = { ...career, lastRollover: undefined, lastDevelopment: undefined };

    const review = offSeasonReview(bare);

    expect(review.money).toBeNull();
    expect(review.retired).toEqual([]);
    expect(review.risers).toEqual([]);
    expect(review.fallers).toEqual([]);
  });
});
