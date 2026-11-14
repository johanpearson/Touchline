import { describe, expect, it } from "vitest";
import { carry, foul, interception, pass, shot, tackle } from "./action-event-builders";
import { playerRatings } from "./player-ratings";
import * as c from "./rating-constants";

const players = ["h1", "h2", "a1", "hg", "ag"].map((id) => ({ id }));
const rating = (events: Parameters<typeof playerRatings>[0], id: string) =>
  playerRatings(events, players)[id];

describe("rating constants", () => {
  it("has the documented weights", () => {
    expect(c.RATING_BASELINE).toBe(6);
    expect([c.RATING_MIN, c.RATING_MAX]).toEqual([1, 10]);
    expect(c.GOAL_BONUS).toBe(1);
    expect(c.KEY_PASS_BONUS).toBe(0.3);
    expect(c.PROGRESSIVE_PASS_BONUS).toBe(0.1);
    expect(c.TACKLE_WON_BONUS).toBe(0.2);
    expect(c.INTERCEPTION_BONUS).toBe(0.2);
    expect(c.SAVE_BONUS).toBe(0.3);
    expect(c.LOST_DUEL_PENALTY).toBe(0.15);
    expect(c.MISSED_CHANCE_PENALTY).toBe(0.3);
    expect(c.FOUL_PENALTY).toBe(0.2);
    expect(c.GOAL_CONCEDED_PENALTY).toBe(0.5);
    expect(c.PROGRESSIVE_PASS_METRES).toBe(10);
    expect(c.BIG_CHANCE_XG).toBe(0.3);
  });
});

describe("playerRatings", () => {
  it("gives every listed player the baseline when nothing happened", () => {
    expect(playerRatings([], players)).toEqual({ h1: 6, h2: 6, a1: 6, hg: 6, ag: 6 });
  });

  it("is deterministic", () => {
    const events = [shot("home", "h1", "goal", 0.2, "ag")];
    expect(playerRatings(events, players)).toEqual(playerRatings(events, players));
  });

  it("rewards a goal for the scorer and charges the keeper", () => {
    const events = [shot("home", "h1", "goal", 0.1, "ag")];
    expect(rating(events, "h1")).toBeCloseTo(7);
    expect(rating(events, "ag")).toBeCloseTo(5.5);
  });

  it("rewards a save", () => {
    expect(rating([shot("home", "h1", "saved", 0.1, "ag")], "ag")).toBeCloseTo(6.3);
  });

  it("penalises a missed big chance but not a missed long shot", () => {
    expect(rating([shot("home", "h1", "missed", 0.3, "ag")], "h1")).toBeCloseTo(5.7);
    expect(rating([shot("home", "h1", "missed", 0.29, "ag")], "h1")).toBeCloseTo(6);
  });

  it("rewards a key pass", () => {
    const events = [
      pass("home", "h1", "h2", "complete", {
        time: 1,
        to: { x: 52, y: 34 },
        from: { x: 50, y: 34 },
      }),
      shot("home", "h2", "missed", 0.1, "ag", { time: 2 }),
    ];
    expect(rating(events, "h1")).toBeCloseTo(6.3);
  });

  it("rewards completed progressive passes towards the attacked goal for both sides", () => {
    const home = pass("home", "h1", "h2", "complete", {
      from: { x: 40, y: 34 },
      to: { x: 50, y: 34 },
    });
    const homeShort = pass("home", "h1", "h2", "complete", {
      from: { x: 40, y: 34 },
      to: { x: 49.9, y: 34 },
    });
    const away = pass("away", "a1", "h2", "complete", {
      from: { x: 60, y: 34 },
      to: { x: 50, y: 34 },
    });
    const awayBack = pass("away", "a1", "h2", "complete", {
      from: { x: 50, y: 34 },
      to: { x: 60, y: 34 },
    });
    const lost = pass("home", "h1", "h2", "intercepted", {
      from: { x: 40, y: 34 },
      to: { x: 60, y: 34 },
    });
    expect(rating([home], "h1")).toBeCloseTo(6.1);
    expect(rating([homeShort], "h1")).toBeCloseTo(6);
    expect(rating([away], "a1")).toBeCloseTo(6.1);
    expect(rating([awayBack], "a1")).toBeCloseTo(6);
    expect(rating([lost], "h1")).toBeCloseTo(6);
  });

  it("rewards tackles won and interceptions", () => {
    expect(rating([tackle("away", "a1", "won")], "a1")).toBeCloseTo(6.2);
    expect(rating([interception("away", "a1")], "a1")).toBeCloseTo(6.2);
  });

  it("penalises lost duels and fouls", () => {
    expect(rating([tackle("away", "a1", "lost")], "a1")).toBeCloseTo(5.85);
    expect(rating([carry("home", "h1", "tackled")], "h1")).toBeCloseTo(5.85);
    expect(rating([carry("home", "h1", "kept")], "h1")).toBeCloseTo(6);
    expect(rating([foul("home", "h1", "a1")], "a1")).toBeCloseTo(5.8);
    expect(rating([foul("home", "h1", "a1")], "h1")).toBeCloseTo(6);
  });

  it("clamps to 1..10", () => {
    const many = (n: number, f: () => ReturnType<typeof shot>) => Array.from({ length: n }, f);
    expect(
      rating(
        many(10, () => shot("home", "h1", "goal", 0.1, "ag")),
        "h1",
      ),
    ).toBe(10);
    expect(
      rating(
        many(20, () => shot("home", "h1", "goal", 0.1, "ag")),
        "ag",
      ),
    ).toBe(1);
  });

  it("ignores events of players that are not listed", () => {
    expect(playerRatings([shot("home", "x", "goal", 0.1, "y")], players)).toEqual(
      playerRatings([], players),
    );
  });
});
