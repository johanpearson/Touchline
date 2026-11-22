import { describe, expect, it } from "vitest";
import {
  type ActionEvent,
  type ChanceResult,
  chancesOf,
  createPhaseMatch,
  type StepChance,
} from "../engine";
import { aMatchInput } from "../engine/action/action-builders";
import { pass, shot } from "../engine/action/action-event-builders";
import {
  type ActionCommentaryContext,
  generateActionCommentary,
} from "./generate-action-commentary";

const players: Record<string, string> = { "h-9": "Ek", "h-10": "Lund", "a-1": "Berg" };

const context = (locale: "en" | "sv", chances: readonly StepChance[]): ActionCommentaryContext => ({
  locale,
  names: { home: "Kvarnby", away: "Västerås" },
  players,
  chances,
});

const aChance = (result: ChanceResult, changes: Partial<StepChance> = {}): StepChance => ({
  kind: "throughBall",
  creator: "h-10",
  shooter: "h-9",
  situation: "box",
  xg: 0.4,
  result,
  keeper: "a-1",
  aftermath: "goalKick",
  from: { x: 90, y: 34 },
  team: "home",
  period: "firstHalf",
  time: 102,
  step: 0,
  clear: true,
  ...changes,
});

const outcomeOf = (result: ChanceResult) =>
  result === "over" || result === "wide" ? "missed" : result;

const eventsFor = (chance: StepChance): ActionEvent[] => [
  pass("home", chance.creator, chance.shooter, "complete", { time: chance.time - 2 }),
  shot("home", chance.shooter, outcomeOf(chance.result), chance.xg, chance.keeper, {
    time: chance.time,
  }),
];

const linesOf = (chance: StepChance, locale: "en" | "sv" = "en", seed = 1) =>
  generateActionCommentary(eventsFor(chance), context(locale, [chance]), seed);

describe("chance narration (unit)", () => {
  it("narrates a clear chance with a build-up line and a reaction line", () => {
    const lines = linesOf(aChance("saved"));
    expect(lines.map((l) => l.kind)).toEqual(["chance", "chance"]);
    expect(lines[0]?.text).toContain("Lund");
    expect(lines[1]?.text).toContain("Ek");
    expect(lines[1]?.text).toContain("Berg");
  });

  it.each(["saved", "woodwork", "blocked", "wide", "over"] as const)(
    "gives a reaction line for a clear chance that ends %s",
    (result) => {
      const lines = linesOf(aChance(result));
      expect(lines).toHaveLength(2);
      expect(lines[1]?.text).toContain("Ek");
    },
  );

  it.each([
    "openPlay",
    "throughBall",
    "cross",
    "cutBack",
    "counter",
    "setPiece",
    "freeKick",
  ] as const)("writes a build-up line for a %s chance in both locales", (kind) => {
    for (const locale of ["en", "sv"] as const) {
      const [buildUp] = linesOf(aChance("saved", { kind }), locale);
      expect(buildUp?.text).toContain(kind === "freeKick" ? "Ek" : "Lund");
      expect(buildUp?.text).not.toMatch(/[{}]/);
    }
  });

  it("keeps the goal line after the build-up and counts the goal", () => {
    const lines = linesOf(aChance("goal"));
    expect(lines.map((l) => l.kind)).toEqual(["chance", "goal"]);
    expect(lines[1]?.text).toContain("1–0");
    expect(lines[1]?.importance).toBe("big");
  });

  it("puts the keeper and shooter in the Swedish reaction lines", () => {
    const [, reaction] = linesOf(aChance("saved"), "sv");
    expect(reaction?.text).toContain("Berg");
    expect(reaction?.text).toContain("Ek");
  });

  it("gives a shot that is not a clear chance the old treatment", () => {
    const chance = aChance("saved", { xg: 0.05, clear: false });
    const lines = linesOf(chance);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.every((l) => !l.text.includes("Lund") || l.text.includes("Ek"))).toBe(true);
  });

  it("is deterministic", () => {
    const chance = aChance("woodwork");
    expect(linesOf(chance, "en", 4)).toEqual(linesOf(chance, "en", 4));
  });
});

const input = aMatchInput().withEngineVersion(3).build();
const names: Record<string, string> = Object.fromEntries(
  [...input.home.starters, ...input.away.starters].map((p) => [p.id, p.id.toUpperCase()]),
);

const playV3 = (seed: number) => {
  const match = createPhaseMatch(input, seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return { events: [...match.events] as ActionEvent[], chances: chancesOf(match.steps) };
};

const SEEDS = Array.from({ length: 12 }, (_, i) => 9100 + i);
const matches = SEEDS.map((seed) => ({ seed, ...playV3(seed) }));

describe("chance narration over seeded v3 matches", { timeout: 60000 }, () => {
  const narrate = (m: (typeof matches)[number], locale: "en" | "sv") =>
    generateActionCommentary(
      m.events,
      { locale, names: { home: "Kvarnby", away: "Västerås" }, players: names, chances: m.chances },
      m.seed,
    );

  it("gives every clear chance at least one line, and two unless it is a penalty", () => {
    for (const m of matches) {
      const lines = narrate(m, "en");
      for (const c of m.chances.filter((x) => x.clear)) {
        const own = lines.filter((l) => l.time === c.time && l.team === c.team);
        expect(own.length, `seed ${m.seed} chance at ${c.time}`).toBeGreaterThanOrEqual(
          c.kind === "penalty" ? 1 : 2,
        );
      }
    }
  });

  it("never repeats a line twice in a row", () => {
    for (const m of matches) {
      for (const locale of ["en", "sv"] as const) {
        const texts = narrate(m, locale).map((l) => l.text);
        texts.forEach((text, i) => {
          if (i > 0) expect(text, `seed ${m.seed} ${locale} line ${i}`).not.toBe(texts[i - 1]);
        });
      }
    }
  });

  it("names the creator of a clear chance in the build-up line", () => {
    const m = matches[0] as (typeof matches)[number];
    const lines = narrate(m, "en");
    const clear = m.chances.filter((c) => c.clear && c.kind !== "penalty");
    expect(clear.length).toBeGreaterThan(0);
    for (const c of clear) {
      const own = lines.filter((l) => l.time === c.time && l.team === c.team);
      expect(own[0]?.text).toContain((c.kind === "freeKick" ? c.shooter : c.creator).toUpperCase());
    }
  });

  it("leaves earlier lines unchanged when the log grows", () => {
    const m = matches[1] as (typeof matches)[number];
    const full = narrate(m, "en");
    for (const cut of [60, 300, m.events.length - 1]) {
      const part = generateActionCommentary(
        m.events.slice(0, cut),
        {
          locale: "en",
          names: { home: "Kvarnby", away: "Västerås" },
          players: names,
          chances: m.chances,
        },
        m.seed,
      );
      expect(full.slice(0, part.length)).toEqual(part);
    }
  });
});
