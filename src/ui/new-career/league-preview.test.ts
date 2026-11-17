import { describe, expect, it } from "vitest";
import { generateLeague } from "../../game";
import { clubRating } from "../club-rating";
import { previewLeague, ROADMAP_LEAGUES, TOP_CLUBS_SHOWN } from "./league-preview";

const SEED = 11;

const league = () => {
  const result = generateLeague({ seed: SEED });
  if (!result.ok) throw new Error("league");
  return result.league;
};

describe("previewLeague", () => {
  it("names the generated league and counts its clubs", () => {
    const preview = previewLeague(SEED);
    expect(preview?.id).toBe(league().id);
    expect(preview?.name).toBe(league().name);
    expect(preview?.clubCount).toBe(14);
  });

  it("derives the rounds from the club count (double round-robin)", () => {
    expect(previewLeague(SEED)?.rounds).toBe(26);
  });

  it("lists the five strongest clubs with kit and rating, strongest first", () => {
    const { clubs, players } = league();
    const expected = clubs
      .map((club) => ({ club, rating: clubRating(club, players) }))
      .sort((a, b) => b.rating - a.rating || a.club.name.localeCompare(b.club.name))
      .slice(0, TOP_CLUBS_SHOWN)
      .map(({ club, rating }) => ({
        id: club.id,
        name: club.name,
        kit: { body: club.colours.primary, trim: club.colours.secondary },
        rating,
      }));
    expect(previewLeague(SEED)?.topClubs).toEqual(expected);
    expect(previewLeague(SEED)?.topClubs).toHaveLength(5);
  });

  it("counts the other clubs and gives the rating range of the whole league", () => {
    const { clubs, players } = league();
    const ratings = clubs.map((club) => clubRating(club, players));
    const preview = previewLeague(SEED);
    expect(preview?.moreCount).toBe(9);
    expect(preview?.minRating).toBe(Math.min(...ratings));
    expect(preview?.maxRating).toBe(Math.max(...ratings));
  });

  it("is deterministic for a seed and differs between seeds", () => {
    expect(previewLeague(SEED)).toEqual(previewLeague(SEED));
    expect(previewLeague(SEED)?.topClubs).not.toEqual(previewLeague(SEED + 1)?.topClubs);
  });
});

describe("ROADMAP_LEAGUES", () => {
  it("has unique ids and does not reuse the playable league", () => {
    const ids = ROADMAP_LEAGUES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(league().id);
  });
});
