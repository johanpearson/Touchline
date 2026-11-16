import { describe, expect, it } from "vitest";
import { generateLeague, kitsOf, playerOverall } from "../../game";
import { clubRating } from "../club-rating";
import {
  BUDGET_MAX_MILLIONS,
  BUDGET_MIN_MILLIONS,
  buildClubCards,
  difficultyForRank,
  indicativeBudget,
} from "./club-cards";

const league = (seed = 11) => {
  const result = generateLeague({ seed });
  if (!result.ok) throw new Error("league");
  return result.league;
};

describe("difficultyForRank", () => {
  const ranks = Array.from({ length: 14 }, (_, rank) => difficultyForRank(rank, 14));

  it("makes the top 3 easy, the next 4 normal, the next 4 hard and the bottom 3 very hard", () => {
    expect(ranks).toEqual([
      ...Array(3).fill("easy"),
      ...Array(4).fill("normal"),
      ...Array(4).fill("hard"),
      ...Array(3).fill("veryHard"),
    ]);
  });

  it("holds for another league size: easy first, very hard last, in order", () => {
    const sixteen = Array.from({ length: 16 }, (_, rank) => difficultyForRank(rank, 16));
    expect(sixteen[0]).toBe("easy");
    expect(sixteen[15]).toBe("veryHard");
    expect(sixteen.filter((d) => d === "easy")).toHaveLength(3);
    expect(sixteen.filter((d) => d === "veryHard")).toHaveLength(3);
    const order = ["easy", "normal", "hard", "veryHard"];
    const indexes = sixteen.map((d) => order.indexOf(d));
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });
});

describe("indicativeBudget", () => {
  it("gives the top club the maximum and the bottom club the minimum", () => {
    expect(indicativeBudget(0, 14)).toBe(BUDGET_MAX_MILLIONS);
    expect(indicativeBudget(13, 14)).toBe(BUDGET_MIN_MILLIONS);
  });

  it("falls with every rank and stays in whole half millions", () => {
    const budgets = Array.from({ length: 14 }, (_, rank) => indicativeBudget(rank, 14));
    for (let i = 1; i < budgets.length; i++) {
      expect(budgets[i] as number).toBeLessThan(budgets[i - 1] as number);
    }
    expect(budgets.every((b) => Number.isInteger(b * 2))).toBe(true);
  });

  it("gives a one-club league the maximum", () => {
    expect(indicativeBudget(0, 1)).toBe(BUDGET_MAX_MILLIONS);
  });
});

describe("buildClubCards", () => {
  const { clubs, players } = league();
  const cards = buildClubCards(clubs, players);

  it("has one card per club, sorted by rating (name breaks ties)", () => {
    expect(cards).toHaveLength(clubs.length);
    const expected = clubs
      .map((club) => ({ club, rating: clubRating(club, players) }))
      .sort((a, b) => b.rating - a.rating || a.club.name.localeCompare(b.club.name))
      .map(({ club }) => club.id);
    expect(cards.map((c) => c.club.id)).toEqual(expected);
  });

  it("numbers ranks from 1 and derives difficulty and budget from the rank", () => {
    cards.forEach((card, index) => {
      expect(card.rank).toBe(index + 1);
      expect(card.difficulty).toBe(difficultyForRank(index, cards.length));
      expect(card.budgetMillions).toBe(indicativeBudget(index, cards.length));
    });
  });

  it("carries rating and the three line ratings from 0 to 100", () => {
    const first = cards[0];
    if (!first) throw new Error("no card");
    expect(first.rating).toBe(clubRating(first.club, players));
    for (const value of [first.attack, first.midfield, first.defence]) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("names the club's best player as the star", () => {
    for (const card of cards) {
      const squad = players.filter((p) => card.club.playerIds.includes(p.id));
      const best = Math.max(...squad.map(playerOverall));
      const star = squad.find((p) => p.id === card.star?.id);
      expect(star && playerOverall(star)).toBe(best);
      expect(card.star?.name).toBe(star?.name);
      expect(card.star?.position).toBe(star?.position);
    }
  });

  it("shows home and away kits from kitsOf", () => {
    for (const card of cards) expect(card.kits).toEqual(kitsOf(card.club));
  });
});
