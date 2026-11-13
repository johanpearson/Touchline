import { describe, expect, it } from "vitest";
import { generateLeague } from "../game";
import { clubRating } from "./club-rating";

const league = (seed: number) => {
  const result = generateLeague({ seed });
  if (!result.ok) throw new Error("league");
  return result.league;
};

describe("clubRating", () => {
  it("is a whole number from 0 to 100", () => {
    const { clubs, players } = league(1);
    for (const club of clubs) {
      const rating = clubRating(club, players);
      expect(Number.isInteger(rating)).toBe(true);
      expect(rating).toBeGreaterThanOrEqual(0);
      expect(rating).toBeLessThanOrEqual(100);
    }
  });

  it("is the same for the same league", () => {
    const a = league(7);
    const b = league(7);
    expect(clubRating(a.clubs[0]!, a.players)).toBe(clubRating(b.clubs[0]!, b.players));
  });

  it("varies between clubs of different strength", () => {
    const { clubs, players } = league(3);
    const ratings = clubs.map((club) => clubRating(club, players));
    expect(Math.max(...ratings)).toBeGreaterThan(Math.min(...ratings));
  });
});
