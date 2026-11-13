import { describe, expect, it } from "vitest";
import { createMatch, type MatchEvent, type MatchInput } from "../engine";
import { type CommentaryContext, generateCommentary } from "./generate-commentary";

const team = (name: string) => ({
  name,
  buildUp: 0.5,
  progression: 0.5,
  chanceCreation: 0.5,
  finishing: 0.5,
  pressing: 0.5,
  defending: 0.5,
  goalkeeping: 0.5,
});
const matchInput = (): MatchInput => ({
  home: team("Kvarnby"),
  away: team("Västerås"),
  homeTactics: {},
  awayTactics: {},
});

const at = { x: 0.5, y: 0.5 };
const ev = (time: number, rest: Record<string, unknown>): MatchEvent =>
  ({ time, team: "home", position: at, intensity: 0.5, ...rest }) as MatchEvent;

const context = (locale: "en" | "sv" = "en"): CommentaryContext => ({
  locale,
  names: { home: "Kvarnby", away: "Västerås" },
  scorers: ["Ek", "Lund", "Berg"],
});

const lines = (events: MatchEvent[], locale: "en" | "sv" = "en", seed = 1) =>
  generateCommentary(events, context(locale), seed);

const playedMatch = (seed: number): MatchEvent[] => {
  const match = createMatch(matchInput(), seed);
  match.advanceTo(10000);
  match.resume();
  match.advanceTo(20000);
  return [...match.events];
};

describe("generateCommentary", () => {
  it("is deterministic for the same events and seed", () => {
    const events = playedMatch(7);
    expect(lines(events, "en", 3)).toEqual(lines(events, "en", 3));
  });

  it("does not change the events it reads", () => {
    const events = playedMatch(7);
    const copy = structuredClone(events);
    lines(events);
    expect(events).toEqual(copy);
  });

  it("does not influence the simulation", () => {
    const a = createMatch(matchInput(), 11);
    const b = createMatch(matchInput(), 11);
    a.advanceTo(2700);
    generateCommentary(a.events, context(), 99);
    b.advanceTo(2700);
    expect(a.events).toEqual(b.events);
  });

  it("gives the same lines for a match so far, however much more is played", () => {
    const events = playedMatch(5);
    const early = events.filter((e) => e.time <= 1500);
    const full = lines(events).filter((l) => l.time <= 1500);
    expect(lines(early)).toEqual(full);
  });

  it("names the scorer, the team and the score on a goal", () => {
    const [line] = lines([ev(600, { type: "goal", xg: 0.3 })]);
    expect(line?.kind).toBe("goal");
    expect(line?.importance).toBe("big");
    expect(line?.team).toBe("home");
    expect(line?.text).toContain("Ek");
    expect(line?.text).toContain("1–0");
  });

  it("names the scorers in goal order, whichever team scored", () => {
    const out = lines([
      ev(100, { type: "goal", xg: 0.3 }),
      ev(200, { type: "goal", xg: 0.3, team: "away" }),
      ev(300, { type: "goal", xg: 0.3 }),
    ]);
    expect(out[0]?.text).toContain("Ek");
    expect(out[1]?.text).toContain("Lund");
    expect(out[2]?.text).toContain("Berg");
  });

  it("does not change its other lines with the scorers it is given", () => {
    const events = playedMatch(5);
    const other = generateCommentary(events, { ...context(), scorers: ["A", "B", "C", "D"] }, 1);
    const strip = (l: { text: string; kind: string }) => (l.kind === "goal" ? l.kind : l.text);
    expect(other.map(strip)).toEqual(lines(events).map(strip));
  });

  it("counts goals for the score in later lines", () => {
    const out = lines([
      ev(100, { type: "goal", xg: 0.3 }),
      ev(200, { type: "goal", xg: 0.3, team: "away" }),
      ev(300, { type: "goal", xg: 0.3, team: "away" }),
    ]);
    expect(out[2]?.text).toContain("1–2");
  });

  it("does not name players on anything but goals", () => {
    const events = playedMatch(3);
    for (const line of lines(events)) {
      if (line.kind !== "goal") {
        expect(line.text).not.toContain("Ek");
        expect(line.text).not.toContain("Lund");
      }
    }
  });

  it("writes in the requested locale", () => {
    const en = lines([ev(600, { type: "corner" })], "en");
    const sv = lines([ev(600, { type: "corner" })], "sv");
    expect(en[0]?.text).not.toBe(sv[0]?.text);
    expect(sv[0]?.text).toMatch(/[Hh]örna/);
  });

  it("uses the Swedish genitive for the opponent's keeper", () => {
    const text = lines(
      Array.from({ length: 40 }, (_, i) => ev(10 + i, { type: "shot", xg: 0.2, outcome: "saved" })),
      "sv",
    )
      .map((l) => l.text)
      .join("\n");
    expect(text).toContain("Västerås målvakt");
    expect(text).not.toContain("Västeråss");
  });

  it("stays silent about minor shots", () => {
    expect(lines([ev(60, { type: "shot", xg: 0.01, outcome: "missed" })])).toEqual([]);
  });

  it("describes a shot that is not a goal, and leaves the goal outcome to the goal event", () => {
    expect(lines([ev(60, { type: "shot", xg: 0.1, outcome: "saved" })])).toHaveLength(1);
    expect(lines([ev(60, { type: "shot", xg: 0.3, outcome: "goal" })])).toEqual([]);
  });

  it("gives half-time and full-time lines with the score", () => {
    const out = lines([
      ev(100, { type: "goal", xg: 0.3 }),
      ev(2800, { type: "periodChange", period: "halfTime" }),
      ev(2800, { type: "periodChange", period: "secondHalf" }),
      ev(5500, { type: "periodChange", period: "fullTime" }),
    ]);
    const kinds = out.map((l) => l.kind);
    expect(kinds).toContain("halfTime");
    expect(kinds).toContain("fullTime");
    expect(out.find((l) => l.kind === "halfTime")?.text).toContain("1–0");
    expect(out.find((l) => l.kind === "fullTime")?.text).toContain("1–0");
  });

  it("summarises possession every 15 minutes", () => {
    const events: MatchEvent[] = [
      ev(0, { type: "kickoff" }),
      ev(1000, { type: "corner" }),
      ev(1900, { type: "corner" }),
    ];
    const summaries = lines(events).filter((l) => l.kind === "summary");
    expect(summaries.map((s) => s.time)).toEqual([900, 1800]);
  });

  it("reports the dominant team and its possession share in a summary", () => {
    const events: MatchEvent[] = [ev(0, { type: "kickoff" }), ev(1000, { type: "corner" })];
    const [summary] = lines(events).filter((l) => l.kind === "summary");
    expect(summary?.team).toBe("home");
    expect(summary?.text).toContain("100");
  });

  it("gives an even summary when neither team has the ball", () => {
    const events: MatchEvent[] = [
      ev(0, { type: "kickoff" }),
      ev(450, { type: "turnover", team: "away" }),
      ev(1000, { type: "corner" }),
    ];
    const [summary] = lines(events).filter((l) => l.kind === "summary");
    expect(summary?.team).toBeUndefined();
  });

  it("orders lines by time", () => {
    const out = lines(playedMatch(9));
    const times = out.map((l) => l.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("produces varied text over a whole match", () => {
    const texts = lines(playedMatch(2)).map((l) => l.text);
    expect(new Set(texts).size).toBeGreaterThan(10);
  });
});
