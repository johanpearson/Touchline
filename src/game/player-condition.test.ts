import { describe, expect, it } from "vitest";
import { aCondition, aPlayer } from "./game-builders";
import { ATTRIBUTE_NAMES } from "./player";
import {
  applyMatchToCondition,
  effectiveAttributes,
  FITNESS_DRAIN_PER_MATCH,
  FITNESS_RECOVERY_RATE,
  initialCondition,
  type MatchOutcome,
  recoverCondition,
} from "./player-condition";

describe("initialCondition", () => {
  it("starts with full fitness and neutral form", () => {
    expect(initialCondition()).toEqual({ fitness: 100, form: 5 });
  });
});

describe("applyMatchToCondition", () => {
  const cases: {
    name: string;
    start: { fitness: number; form: number };
    minutes: number;
    outcome: MatchOutcome;
    expected: { fitness: number; form: number };
  }[] = [
    {
      name: "90 min win",
      start: { fitness: 100, form: 5 },
      minutes: 90,
      outcome: "win",
      expected: { fitness: 90, form: 6 },
    },
    {
      name: "90 min defeat",
      start: { fitness: 100, form: 5 },
      minutes: 90,
      outcome: "defeat",
      expected: { fitness: 90, form: 4 },
    },
    {
      name: "90 min draw",
      start: { fitness: 100, form: 5 },
      minutes: 90,
      outcome: "draw",
      expected: { fitness: 90, form: 5 },
    },
    {
      name: "45 min draw",
      start: { fitness: 100, form: 5 },
      minutes: 45,
      outcome: "draw",
      expected: { fitness: 95, form: 5 },
    },
    {
      name: "45 min win counts for form",
      start: { fitness: 80, form: 5 },
      minutes: 45,
      outcome: "win",
      expected: { fitness: 75, form: 6 },
    },
    {
      name: "44 min win leaves form",
      start: { fitness: 80, form: 5 },
      minutes: 44,
      outcome: "win",
      expected: { fitness: 80 - (10 * 44) / 90, form: 5 },
    },
    {
      name: "0 minutes win changes nothing",
      start: { fitness: 77, form: 5 },
      minutes: 0,
      outcome: "win",
      expected: { fitness: 77, form: 5 },
    },
    {
      name: "fitness clamps at 0",
      start: { fitness: 4, form: 5 },
      minutes: 90,
      outcome: "draw",
      expected: { fitness: 0, form: 5 },
    },
    {
      name: "form clamps at 10",
      start: { fitness: 50, form: 10 },
      minutes: 90,
      outcome: "win",
      expected: { fitness: 40, form: 10 },
    },
    {
      name: "form clamps at 1",
      start: { fitness: 50, form: 1 },
      minutes: 90,
      outcome: "defeat",
      expected: { fitness: 40, form: 1 },
    },
  ];

  it.each(cases)("$name", ({ start, minutes, outcome, expected }) => {
    expect(applyMatchToCondition(start, { minutes, outcome })).toEqual(expected);
  });

  it("does not mutate its input", () => {
    const condition = aCondition().build();
    const copy = { ...condition };
    applyMatchToCondition(condition, { minutes: 90, outcome: "win" });
    expect(condition).toEqual(copy);
  });

  it("clamps minutes above 90 to a full match", () => {
    const result = applyMatchToCondition(initialCondition(), { minutes: 120, outcome: "draw" });
    expect(result.fitness).toBe(100 - FITNESS_DRAIN_PER_MATCH);
  });
});

describe("recoverCondition", () => {
  it("recovers 25% of the missing fitness and leaves form", () => {
    expect(recoverCondition({ fitness: 60, form: 7 })).toEqual({ fitness: 70, form: 7 });
  });

  it("recovers a player who did not play", () => {
    const rested = applyMatchToCondition({ fitness: 80, form: 5 }, { minutes: 0, outcome: "win" });
    expect(recoverCondition(rested).fitness).toBe(85);
  });

  it("keeps full fitness at 100", () => {
    expect(recoverCondition(initialCondition()).fitness).toBe(100);
  });

  it("converges to 100 and never exceeds it", () => {
    let condition = aCondition().withFitness(0).build();
    for (let i = 0; i < 60; i++) {
      condition = recoverCondition(condition);
      expect(condition.fitness).toBeLessThanOrEqual(100);
    }
    expect(condition.fitness).toBeCloseTo(100, 5);
  });

  it("uses the named recovery rate", () => {
    expect(FITNESS_RECOVERY_RATE).toBe(0.25);
  });

  it("does not mutate its input", () => {
    const condition = aCondition().withFitness(50).build();
    recoverCondition(condition);
    expect(condition.fitness).toBe(50);
  });
});

describe("fitness over a season", () => {
  const playSeason = (plays: (matchday: number) => boolean) => {
    let condition = initialCondition();
    const beforeKickoff: number[] = [];
    for (let matchday = 0; matchday < 26; matchday++) {
      beforeKickoff.push(condition.fitness);
      const minutes = plays(matchday) ? 90 : 0;
      condition = recoverCondition(applyMatchToCondition(condition, { minutes, outcome: "draw" }));
    }
    return beforeKickoff;
  };

  it("settles a starter who plays every matchday at 65 to 75 fitness before kickoff", () => {
    const beforeKickoff = playSeason(() => true);
    for (const fitness of beforeKickoff.slice(-10)) {
      expect(fitness).toBeGreaterThanOrEqual(65);
      expect(fitness).toBeLessThanOrEqual(75);
    }
  });

  it("brings a player who rests one matchday in four back above 80 after each rest", () => {
    const beforeKickoff = playSeason((matchday) => matchday % 4 !== 3);
    const afterRest = beforeKickoff.filter((_, matchday) => matchday % 4 === 0 && matchday > 0);
    for (const fitness of afterRest) expect(fitness).toBeGreaterThan(80);
  });

  it("keeps a rotated player fresher on average than a starter who never rests", () => {
    const average = (values: number[]) => values.reduce((a, b) => a + b) / values.length;
    const rotated = average(playSeason((matchday) => matchday % 4 !== 3).slice(-12));
    const everyMatch = average(playSeason(() => true).slice(-12));
    expect(rotated).toBeGreaterThan(everyMatch + 5);
  });
});

describe("effectiveAttributes", () => {
  it("returns the stored attributes exactly for a neutral condition", () => {
    const player = aPlayer().withPassing(13).withFinishing(7).withReflexes(18).build();
    const result = effectiveAttributes(player, initialCondition());
    for (const name of ATTRIBUTE_NAMES) expect(result[name]).toBe(player[name]);
  });

  it("scales by 0.85 at fitness 0", () => {
    const player = aPlayer().withAllAttributes(20).build();
    const result = effectiveAttributes(player, aCondition().withFitness(0).build());
    expect(result.passing).toBeCloseTo(17, 10);
  });

  it("scales by 1.05 at form 10", () => {
    const player = aPlayer().withAllAttributes(10).build();
    const result = effectiveAttributes(player, aCondition().withForm(10).build());
    expect(result.pace).toBeCloseTo(10.5, 10);
  });

  it("scales goalkeeper attributes the same way", () => {
    const keeper = aPlayer().withPosition("GK").withHandling(16).withReflexes(12).build();
    const result = effectiveAttributes(keeper, aCondition().withFitness(0).build());
    expect(result.handling).toBeCloseTo(16 * 0.85, 10);
    expect(result.reflexes).toBeCloseTo(12 * 0.85, 10);
  });

  it("does not clamp the result to the attribute range", () => {
    const player = aPlayer().withAllAttributes(20).build();
    expect(effectiveAttributes(player, aCondition().withForm(10).build()).passing).toBeCloseTo(
      21,
      10,
    );
  });

  it("returns only the twelve attributes and does not mutate the player", () => {
    const player = aPlayer().build();
    const copy = { ...player };
    const result = effectiveAttributes(player, aCondition().withFitness(30).build());
    expect(Object.keys(result).sort()).toEqual([...ATTRIBUTE_NAMES].sort());
    expect(player).toEqual(copy);
  });
});
