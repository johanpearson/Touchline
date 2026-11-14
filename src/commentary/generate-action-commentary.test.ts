import { describe, expect, it } from "vitest";
import { type ActionEvent, createMatch, type MatchInput } from "../engine";
import { aMatchInputV2, aTeamSheet } from "../engine/action/action-builders";
import { foul, pass, periodChange, setPiece, shot } from "../engine/action/action-event-builders";
import {
  type ActionCommentaryContext,
  generateActionCommentary,
} from "./generate-action-commentary";

const input = (): MatchInput =>
  aMatchInputV2()
    .withHome(aTeamSheet("Kvarnby", "h").build())
    .withAway(aTeamSheet("Västerås", "a").build())
    .build();

const players: Record<string, string> = {};
for (const prefix of ["h", "a"]) {
  for (let i = 1; i <= 11; i += 1) players[`${prefix}-${i}`] = `${prefix.toUpperCase()}${i}`;
}
players["h-9"] = "Ek";
players["h-10"] = "Lund";
players["a-1"] = "Berg";

const context = (locale: "en" | "sv" = "en"): ActionCommentaryContext => ({
  locale,
  names: { home: "Kvarnby", away: "Västerås" },
  players,
});

const cache = new Map<number, ActionEvent[]>();
const play = (seed: number): ActionEvent[] => {
  const match = createMatch(input(), seed);
  match.advanceTo(10000);
  match.resume();
  match.advanceTo(20000);
  return [...match.events] as ActionEvent[];
};

/** Simulated matches are cached: playing them is the slow part of these tests. */
const played = (seed: number): ActionEvent[] => {
  const known = cache.get(seed) ?? play(seed);
  cache.set(seed, known);
  return known;
};

const texts = (events: ActionEvent[], locale: "en" | "sv" = "en", seed = 1) =>
  generateActionCommentary(events, context(locale), seed).map((line) => line.text);

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("generateActionCommentary", { timeout: 30000 }, () => {
  it("is deterministic for the same events and seed", () => {
    const events = played(7);
    expect(texts(events, "en", 3)).toEqual(texts(events, "en", 3));
  });

  it("does not change the events it reads", () => {
    const events = played(7);
    const copy = structuredClone(events);
    texts(events);
    expect(events).toEqual(copy);
  });

  it("does not influence the simulation", () => {
    const a = createMatch(input(), 11);
    const b = createMatch(input(), 11);
    a.advanceTo(2700);
    generateActionCommentary(a.events as ActionEvent[], context(), 99);
    a.advanceTo(2700);
    b.advanceTo(2700);
    expect(a.events).toEqual(b.events);
  });

  it("gives lines in time order", () => {
    for (const seed of SEEDS) {
      const times = generateActionCommentary(played(seed), context(), seed).map((l) => l.time);
      expect(times).toEqual([...times].sort((x, y) => x - y));
    }
  });

  it("keeps the feed to about 60 to 100 lines per match", () => {
    const counts = SEEDS.map(
      (seed) => generateActionCommentary(played(seed), context(), seed).length,
    );
    const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(55);
    expect(Math.max(...counts)).toBeLessThanOrEqual(105);
    expect(mean).toBeGreaterThan(65);
    expect(mean).toBeLessThan(90);
  });

  it("leaves earlier lines unchanged when the log grows", () => {
    const events = played(5);
    const full = generateActionCommentary(events, context(), 5);
    for (const cut of [50, 400, 900, events.length - 1]) {
      const prefix = generateActionCommentary(events.slice(0, cut), context(), 5);
      expect(full.slice(0, prefix.length)).toEqual(prefix);
    }
  });

  it("leaves no placeholder unfilled in either locale", () => {
    for (const locale of ["en", "sv"] as const) {
      for (const seed of SEEDS) {
        for (const text of texts(played(seed), locale, seed)) expect(text).not.toMatch(/[{}]/);
      }
    }
  });

  it("names the scorer and the key passer on a goal", () => {
    const events: ActionEvent[] = [
      pass("home", "h-10", "h-9", "complete", { time: 100 }),
      shot("home", "h-9", "goal", 0.4, "a-1", { time: 102 }),
    ];
    const [line] = generateActionCommentary(events, context(), 1);
    expect(line?.kind).toBe("goal");
    expect(line?.importance).toBe("big");
    expect(line?.text).toContain("Ek");
    expect(line?.text).toContain("1–0");
    expect(texts(events).join(" ")).toContain("Lund");
  });

  it("names only the scorer when no pass led to the goal", () => {
    const events: ActionEvent[] = [shot("home", "h-9", "goal", 0.4, "a-1", { time: 100 })];
    const [line] = generateActionCommentary(events, context(), 1);
    expect(line?.text).toContain("Ek");
    expect(line?.text).not.toContain("Lund");
  });

  it("names shooter and keeper on a big save", () => {
    const events: ActionEvent[] = [shot("home", "h-9", "saved", 0.5, "a-1", { time: 100 })];
    const [line] = generateActionCommentary(events, context(), 1);
    expect(line?.kind).toBe("chance");
    expect(line?.text).toContain("Ek");
    expect(line?.text).toContain("Berg");
  });

  it("gives no line to a negligible shot", () => {
    const events: ActionEvent[] = [shot("home", "h-9", "missed", 0.01, "a-1", { time: 100 })];
    expect(generateActionCommentary(events, context(), 1)).toEqual([]);
  });

  it("names the taker of a corner", () => {
    const events: ActionEvent[] = [setPiece("away", "a-7", "corner", { time: 100 })];
    const [line] = generateActionCommentary(events, context(), 1);
    expect(line?.team).toBe("away");
    expect(line?.text).toContain("A7");
  });

  it("names offender, taker and result of a penalty", () => {
    const awarded: ActionEvent = {
      ...foul("home", "h-9", "a-4", { time: 100 }),
      outcome: "penalty",
    };
    const events: ActionEvent[] = [
      awarded,
      setPiece("home", "h-10", "penalty", { time: 130 }),
      shot("home", "h-10", "saved", 0.76, "a-1", { time: 131 }),
    ];
    const [first, second] = generateActionCommentary(events, context(), 1);
    expect(first?.text).toContain("A4");
    expect(first?.text).toContain("Ek");
    expect(second?.kind).toBe("penalty");
    expect(second?.text).toContain("Berg");
    expect(second?.text).toContain("Lund");
  });

  it("counts a penalty goal in the score", () => {
    const events: ActionEvent[] = [
      setPiece("home", "h-10", "penalty", { time: 130 }),
      shot("home", "h-10", "goal", 0.76, "a-1", { time: 131 }),
    ];
    const [line] = generateActionCommentary(events, context(), 1);
    expect(line?.text).toContain("1–0");
  });

  it("opens with a kickoff and does not comment restarts after goals", () => {
    const events: ActionEvent[] = [
      setPiece("home", "h-9", "kickoff", { time: 0 }),
      shot("home", "h-9", "goal", 0.4, "a-1", { time: 100 }),
      setPiece("away", "a-9", "kickoff", { time: 130 }),
    ];
    const lines = generateActionCommentary(events, context(), 1);
    expect(lines.map((l) => l.kind)).toEqual(["kickoff", "goal"]);
  });

  it("comments the second-half kickoff, half-time and full time with the score", () => {
    const events: ActionEvent[] = [
      shot("home", "h-9", "goal", 0.4, "a-1", { time: 100 }),
      periodChange(2700, "halfTime"),
      periodChange(2700, "secondHalf"),
      setPiece("away", "a-9", "kickoff", { time: 2700 }),
      periodChange(5400, "fullTime"),
    ];
    const lines = generateActionCommentary(events, context(), 1);
    expect(lines.map((l) => l.kind)).toEqual([
      "goal",
      "summary",
      "summary",
      "halfTime",
      "kickoff",
      "summary",
      "summary",
      "fullTime",
    ]);
    expect(lines.find((l) => l.kind === "halfTime")?.text).toContain("1–0");
    expect(lines.find((l) => l.kind === "fullTime")?.text).toContain("1–0");
  });

  it("summarises possession every 15 minutes from the action stats", () => {
    const events: ActionEvent[] = [
      pass("home", "h-1", "h-2", "complete", { time: 10 }),
      pass("home", "h-2", "h-3", "complete", { time: 880 }),
      pass("home", "h-3", "h-4", "complete", { time: 950 }),
    ];
    const summary = generateActionCommentary(events, context(), 1).find(
      (l) => l.kind === "summary",
    );
    expect(summary?.time).toBe(900);
    expect(summary?.team).toBe("home");
    expect(summary?.text).toContain("Kvarnby");
  });

  it("writes Swedish lines too", () => {
    const events: ActionEvent[] = [shot("home", "h-9", "goal", 0.4, "a-1", { time: 100 })];
    expect(texts(events, "sv")[0]).toMatch(/Mål|Där satt|nätar/);
  });
});
