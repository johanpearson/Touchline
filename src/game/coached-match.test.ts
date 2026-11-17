import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { createCoachedMatch } from "./coached-match";
import type { Fixture } from "./generate-fixtures";
import { playMatchdays } from "./season-test-helpers";
import { playFixture, simulateFixture } from "./simulate-fixture";

const START = aCareer();
/** After a few matchdays starters carry fatigue, so AI clubs have tired players to replace. */
const career = playMatchdays(START, 6);
const nextRound = career.season.fixtures.filter(
  (f) => f.matchday === career.season.currentMatchday,
);
const userFixture = nextRound.find(
  (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
) as Fixture;
const aiFixture = nextRound.find((f) => f.id !== userFixture.id) as Fixture;
const END = 1_000_000;

const playInMinutes = (fixture: Fixture, stepSeconds: number) => {
  const match = createCoachedMatch(career, fixture, { detail: "fast" });
  for (let t = stepSeconds; match.state.period !== "halfTime" && t < 4000; t += stepSeconds) {
    match.advanceTo(t);
  }
  match.resume();
  for (
    let t = match.state.time;
    match.state.period !== "fullTime" && t < 10_000;
    t += stepSeconds
  ) {
    match.advanceTo(t);
  }
  return match;
};

describe("createCoachedMatch", () => {
  it("makes AI clubs use substitutions in a match between tired players", () => {
    const subbed = nextRound
      .filter((f) => f.id !== userFixture.id)
      .flatMap((f) => Object.values(playFixture(career, f).aiReports))
      .filter((report) => Object.values(report.minutes).some((m) => m > 0 && m < 90));

    expect(subbed.length).toBeGreaterThan(0);
  });

  it("gives every AI club eleven players' worth of minutes, however the substitutions fall", () => {
    const { aiReports } = playFixture(career, aiFixture);

    for (const report of Object.values(aiReports)) {
      const total = Object.values(report.minutes).reduce((a, b) => a + b, 0);
      expect(total).toBe(990);
    }
  });

  it("coaches only the AI side of the user's fixture", () => {
    const match = createCoachedMatch(career, userFixture, { detail: "fast" });
    match.advanceTo(END);
    match.resume();
    match.advanceTo(END);

    const side = userFixture.homeClubId === career.userClubId ? "away" : "home";
    expect(Object.keys(match.aiReports())).toEqual([side]);
  });

  it("plays the same match whether it is advanced in one go or minute by minute", () => {
    const whole = createCoachedMatch(career, aiFixture, { detail: "fast" });
    whole.advanceTo(END);
    whole.resume();
    whole.advanceTo(END);

    const stepped = playInMinutes(aiFixture, 60);

    expect(stepped.state.score).toEqual(whole.state.score);
    expect(stepped.events.length).toBe(whole.events.length);
    expect(stepped.aiReports()).toEqual(whole.aiReports());
  });

  it("plays the same match as the quick sim and with full detail", () => {
    const full = createCoachedMatch(career, aiFixture);
    full.advanceTo(END);
    full.resume();
    full.advanceTo(END);

    const quick = simulateFixture(career, aiFixture);

    expect(full.state.score).toEqual({ home: quick.homeGoals, away: quick.awayGoals });
  });

  it("gives the same result every time for the same career and fixture", () => {
    expect(playFixture(career, aiFixture)).toEqual(playFixture(career, aiFixture));
  });

  it("records the changes the AI clubs applied in the engine log", () => {
    const changes = nextRound
      .filter((f) => f.id !== userFixture.id)
      .map((f) => playInMinutes(f, 60).changes.length);

    expect(changes.every((n) => n > 0)).toBe(true);
  });
});
