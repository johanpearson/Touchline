import { describe, expect, it } from "vitest";
import { aMatchInput } from "../action/action-builders";
import type { MatchInput } from "../action/match-input";
import { advancePhaseLoop } from "./advance-phase-loop";
import { resumePhaseLoop } from "./resume-phase-loop";
import { startPhaseLoop } from "./start-phase-loop";

const input = (): MatchInput => aMatchInput().withEngineVersion(3).build();
const noPenalty = { home: false, away: false };
const start = (seed: number, detail: "full" | "fast" = "fast") =>
  startPhaseLoop(input(), seed, detail, noPenalty);

describe("startPhaseLoop", () => {
  it("plays the kickoff step of the side that kicks off and nothing else", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { state, context } = start(seed);

      expect(context.steps).toHaveLength(1);
      expect(context.steps[0]).toMatchObject({
        team: context.firstKickoff,
        start: "kickoff",
        period: "firstHalf",
        startTime: 0,
      });
      expect(context.events[0]).toMatchObject({ type: "setPiece", variant: "kickoff", time: 0 });
      expect(state).toMatchObject({ period: "firstHalf", time: 0 });
      expect(state.next).toBeDefined();
    }
  });

  it("lets either side kick off, depending on the seed", () => {
    const sides = new Set(
      Array.from({ length: 40 }, (_, seed) => start(seed).context.firstKickoff),
    );

    expect(sides).toEqual(new Set(["home", "away"]));
  });

  it("keeps the seed and the detail in the context", () => {
    expect(start(12, "full").context).toMatchObject({ seed: 12, detail: "full" });
    expect(start(13, "fast").context).toMatchObject({ seed: 13, detail: "fast" });
  });

  it("draws whole minutes of added time: 1 to 4 in the first half and 2 to 6 in the second", () => {
    const first = new Set<number>();
    const second = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      const { state, context } = start(seed);
      first.add((state.periodEnd - 2700) / 60);
      second.add(context.secondHalfAdded / 60);
    }

    expect([...first].sort()).toEqual([1, 2, 3, 4]);
    expect([...second].sort()).toEqual([2, 3, 4, 5, 6]);
  });

  it("begins level and without fouls", () => {
    const { state } = start(5);

    expect(state.score).toEqual({ home: 0, away: 0 });
    expect(state.fouls).toEqual({ home: 0, away: 0 });
  });

  it("is deterministic for a seed and differs between seeds", () => {
    expect(start(7).context.steps).toEqual(start(7).context.steps);
    expect(start(7).state.periodEnd).toBe(start(7).state.periodEnd);
    expect(JSON.stringify(start(7).context.steps)).not.toBe(JSON.stringify(start(8).context.steps));
  });
});

describe("resumePhaseLoop", () => {
  const atHalfTime = (seed: number) => {
    const { state, context } = start(seed);
    return { state: advancePhaseLoop(state, 10_000, context), context };
  };

  it("refuses to resume outside half-time", () => {
    const { state, context } = start(1);

    expect(() => resumePhaseLoop(state, context)).toThrow("Cannot resume from firstHalf");
  });

  it("starts the second half with a kickoff by the side that did not start the match", () => {
    for (let seed = 0; seed < 20; seed++) {
      const { state, context } = atHalfTime(seed);
      const before = context.steps.length;
      const resumed = resumePhaseLoop(state, context);
      const kickoff = context.steps[before];

      expect(kickoff).toMatchObject({
        period: "secondHalf",
        start: "kickoff",
        team: context.firstKickoff === "home" ? "away" : "home",
        startTime: state.time,
      });
      expect(resumed.period).toBe("secondHalf");
      expect(resumed.time).toBe(state.time);
    }
  });

  it("ends the second half its added time after 45 more minutes", () => {
    const { state, context } = atHalfTime(4);
    const resumed = resumePhaseLoop(state, context);

    expect(resumed.periodEnd).toBe(state.time + 2700 + context.secondHalfAdded);
  });

  it("keeps the score and the fouls of the first half", () => {
    const { state, context } = atHalfTime(6);
    const resumed = resumePhaseLoop(state, context);

    expect(resumed.score.home).toBeGreaterThanOrEqual(state.score.home);
    expect(resumed.fouls.away).toBeGreaterThanOrEqual(state.fouls.away);
  });
});
