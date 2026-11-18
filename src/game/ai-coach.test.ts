import { describe, expect, it } from "vitest";
import {
  AI_FITNESS_MARGIN,
  AI_MAX_SUBSTITUTIONS_PER_WINDOW,
  type AiContext,
  type AiSituation,
  NO_AI_CHANGES,
  planAiChange,
} from "./ai-coach";
import { aCareer } from "./career-builders";
import { aiLineupFor } from "./match-input-for";
import type { Player } from "./player";
import type { PlayerCondition } from "./player-condition";
import { playerOverall } from "./player-overall";
import { clubSquad } from "./squad-plan";

const career = aCareer();
const club = career.league.clubs[1] as (typeof career.league.clubs)[number];
const squad = clubSquad(club, career.league.players);
const plan = aiLineupFor(career, club.id);
const positionOf = (id: string): Player["position"] =>
  (squad.find((p) => p.id === id) as Player).position;
const outfieldStarters = plan.starters.filter((id) => positionOf(id) !== "GK");
const level: AiSituation = { minute: 60, goalsFor: 0, goalsAgainst: 0 };

const fresh = (): Record<string, PlayerCondition> =>
  Object.fromEntries(squad.map((p) => [p.id, { fitness: 100, form: 5 }]));

const withFitness = (
  base: Record<string, PlayerCondition>,
  fitness: Record<string, number>,
): Record<string, PlayerCondition> => ({
  ...base,
  ...Object.fromEntries(Object.entries(fitness).map(([id, f]) => [id, { fitness: f, form: 5 }])),
});

const contextOf = (overrides: Partial<AiContext> = {}): AiContext => ({
  squad,
  plan,
  condition: fresh(),
  previous: NO_AI_CHANGES,
  situation: level,
  ...overrides,
});

const benchFor = (starterId: string): string[] =>
  plan.bench.filter((id) => positionOf(id) === positionOf(starterId));

describe("planAiChange: substitutions", () => {
  it("changes nothing while every starter is fresh", () => {
    expect(planAiChange(contextOf()).substitutions).toEqual([]);
  });

  it("replaces a tired starter by a fitter bench player of the same position", () => {
    const tired = outfieldStarters[0] as string;
    const condition = withFitness(fresh(), { [tired]: 50 });

    const { substitutions } = planAiChange(contextOf({ condition }));

    expect(substitutions).toHaveLength(1);
    expect(substitutions[0]?.off).toBe(tired);
    expect(benchFor(tired)).toContain(substitutions[0]?.on);
  });

  it("takes the strongest of the fitter bench players of that position", () => {
    const tired = outfieldStarters[0] as string;
    const options = benchFor(tired);
    const condition = withFitness(fresh(), { [tired]: 50 });

    const { substitutions } = planAiChange(contextOf({ condition }));
    const overall = (id: string) => playerOverall(squad.find((p) => p.id === id) as Player);

    const chosen = substitutions[0]?.on as string;
    expect(options.every((id) => overall(chosen) >= overall(id))).toBe(true);
  });

  it("does not substitute a starter the bench cannot improve on in fitness", () => {
    const tired = outfieldStarters[0] as string;
    const bench = Object.fromEntries(
      benchFor(tired).map((id) => [id, 50 + AI_FITNESS_MARGIN - 20]),
    );
    const condition = withFitness(fresh(), { [tired]: 50, ...bench });

    expect(planAiChange(contextOf({ condition })).substitutions).toEqual([]);
  });

  it("never substitutes the goalkeeper", () => {
    const keeper = plan.starters.find((id) => positionOf(id) === "GK") as string;
    const condition = withFitness(fresh(), { [keeper]: 10 });

    expect(planAiChange(contextOf({ condition })).substitutions).toEqual([]);
  });

  it("substitutes the most tired starters first and at most two in one window", () => {
    const tired = outfieldStarters.filter((id) => benchFor(id).length > 0).slice(0, 3);
    const unique = [...new Map(tired.map((id) => [positionOf(id), id])).values()];
    const fitness = Object.fromEntries(unique.map((id, i) => [id, 20 + i * 10]));
    const condition = withFitness(fresh(), fitness);

    const { substitutions } = planAiChange(contextOf({ condition }));

    expect(substitutions.length).toBeLessThanOrEqual(AI_MAX_SUBSTITUTIONS_PER_WINDOW);
    expect(substitutions[0]?.off).toBe(unique[0]);
  });

  it("makes at most five substitutions in a match", () => {
    const tired = outfieldStarters[0] as string;
    const condition = withFitness(fresh(), { [tired]: 20 });
    const earlier = Array.from({ length: 5 }, (_, i) => ({
      minute: 45,
      halfTime: true,
      off: `gone-${i}`,
      on: `came-${i}`,
    }));

    const { substitutions } = planAiChange(
      contextOf({ condition, previous: { substitutions: earlier, shouts: [] } }),
    );

    expect(substitutions).toEqual([]);
  });

  it("counts a starter's fatigue from the minute he came on, not from kickoff", () => {
    const tired = outfieldStarters[0] as string;
    const [replacement] = benchFor(tired);
    const condition = withFitness(fresh(), { [replacement as string]: 70 });
    const previous = {
      substitutions: [{ minute: 55, halfTime: false, off: tired, on: replacement as string }],
      shouts: [],
    };

    const { substitutions } = planAiChange(
      contextOf({ condition, previous, situation: { ...level, minute: 60 } }),
    );

    expect(substitutions.find((s) => s.off === replacement)).toBeUndefined();
  });
});

describe("planAiChange: shouts", () => {
  it("shouts Push up when behind from minute 60", () => {
    const situation = { minute: 60, goalsFor: 0, goalsAgainst: 1 };
    expect(planAiChange(contextOf({ situation })).shout).toBe("pushUp");
  });

  it("shouts Calm it down when ahead from minute 60", () => {
    const situation = { minute: 70, goalsFor: 2, goalsAgainst: 1 };
    expect(planAiChange(contextOf({ situation })).shout).toBe("calmDown");
  });

  it("does not shout when the score is level", () => {
    expect(planAiChange(contextOf()).shout).toBeUndefined();
  });

  it("does not shout before minute 60, also not at half-time", () => {
    const situation = { minute: 45, goalsFor: 0, goalsAgainst: 2 };
    expect(planAiChange(contextOf({ situation })).shout).toBeUndefined();
  });

  it("keeps to the cooldown of an earlier shout", () => {
    const previous = { substitutions: [], shouts: [{ kind: "pushUp" as const, minute: 60 }] };
    const behind = { goalsFor: 0, goalsAgainst: 1 };

    const at70 = planAiChange(contextOf({ previous, situation: { minute: 70, ...behind } }));
    const at80 = planAiChange(contextOf({ previous, situation: { minute: 80, ...behind } }));

    expect(at70.shout).toBeUndefined();
    expect(at80.shout).toBe("pushUp");
  });
});
