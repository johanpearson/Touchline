import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../tactics";
import { aMatchInput, anEnginePlayer, aTeamSheet } from "./action-builders";
import { createActionMatch } from "./create-action-match";
import {
  BASE_DRAIN,
  drainPerMinute,
  ENERGY_START,
  energyFactor,
  MAX_ENERGY_PENALTY,
  withEnergy,
} from "./energy";
import type { MatchInput } from "./match-input";

const MINUTE = 60;

const playToMinute = (input: MatchInput, seed: number, minute: number) => {
  const match = createActionMatch(input, seed, { detail: "fast" });
  match.advanceTo(minute * MINUTE);
  return match;
};

describe("energyFactor", () => {
  it("leaves a fully rested player untouched", () => {
    expect(energyFactor(ENERGY_START)).toBe(1);
  });

  it("takes the whole maximum penalty from a player with no energy", () => {
    expect(energyFactor(0)).toBeCloseTo(1 - MAX_ENERGY_PENALTY, 10);
  });

  it("keeps the penalty small until about half the energy is gone", () => {
    expect(1 - energyFactor(50)).toBeLessThan(0.1);
  });

  it("never falls as energy rises", () => {
    for (let e = 0; e < 100; e += 5) {
      expect(energyFactor(e + 5)).toBeGreaterThanOrEqual(energyFactor(e));
    }
  });
});

describe("drainPerMinute", () => {
  const neutral = NEUTRAL_TACTICS;
  const mid = anEnginePlayer("m").withPosition("MID").build();

  it("costs the base drain for an average midfielder at neutral tactics", () => {
    expect(drainPerMinute(mid, neutral)).toBeCloseTo(BASE_DRAIN * 1.1, 10);
  });

  it("costs more with high pressing than with low", () => {
    expect(drainPerMinute(mid, { ...neutral, pressing: "high" })).toBeGreaterThan(
      drainPerMinute(mid, { ...neutral, pressing: "low" }),
    );
  });

  it("costs more with fast tempo than with slow", () => {
    expect(drainPerMinute(mid, { ...neutral, tempo: "fast" })).toBeGreaterThan(
      drainPerMinute(mid, { ...neutral, tempo: "slow" }),
    );
  });

  it("costs more for a high work rate than for a low one", () => {
    const hard = anEnginePlayer("h").withAttribute("workRate", 20).build();
    const lazy = anEnginePlayer("l").withAttribute("workRate", 1).build();
    expect(drainPerMinute(hard, neutral)).toBeGreaterThan(drainPerMinute(lazy, neutral));
  });

  it("costs a goalkeeper least", () => {
    const keeper = anEnginePlayer("g").withPosition("GK").build();
    for (const position of ["DEF", "MID", "FWD"] as const) {
      const other = anEnginePlayer("o").withPosition(position).build();
      expect(drainPerMinute(keeper, neutral)).toBeLessThan(drainPerMinute(other, neutral));
    }
  });
});

describe("withEnergy", () => {
  it("scales every attribute of a tired player and keeps the position and id", () => {
    const player = anEnginePlayer("p").withAttribute("passing", 16).build();

    const tired = withEnergy(player, 0);

    expect(tired.id).toBe("p");
    expect(tired.position).toBe("MID");
    expect(tired.attributes.passing).toBeCloseTo(16 * (1 - MAX_ENERGY_PENALTY), 10);
  });

  it("returns the same player when energy is full", () => {
    const player = anEnginePlayer("p").build();
    expect(withEnergy(player, ENERGY_START)).toBe(player);
  });
});

describe("energy in a match", () => {
  const input = aMatchInput().build();

  it("starts every player of both sides at full energy", () => {
    const match = createActionMatch(input, 1, { detail: "fast" });

    const values = Object.values(match.state.energy);
    expect(values).toHaveLength(22);
    expect(values.every((e) => e === ENERGY_START)).toBe(true);
  });

  it("falls for everyone on the pitch as the match goes on and never rises", () => {
    const match = createActionMatch(input, 2, { detail: "fast" });
    let previous = match.state.energy;
    for (const minute of [10, 20, 30, 40, 45]) {
      match.advanceTo(minute * MINUTE);
      const now = match.state.energy;
      for (const id of Object.keys(previous)) {
        expect(now[id]).toBeLessThanOrEqual(previous[id] ?? 0);
      }
      expect(Object.values(now).every((e) => e < ENERGY_START)).toBe(true);
      previous = now;
    }
  });

  it("drains a goalkeeper slower than an outfield player", () => {
    const { energy } = playToMinute(input, 3, 45).state;

    expect(energy["h-1"]).toBeGreaterThan(energy["h-2"] ?? 0);
  });

  it("drains a side with high pressing faster than one with low pressing", () => {
    const high = aTeamSheet("High", "h")
      .withTactics({ ...NEUTRAL_TACTICS, pressing: "high" })
      .build();
    const low = aTeamSheet("Low", "a")
      .withTactics({ ...NEUTRAL_TACTICS, pressing: "low" })
      .build();

    const { energy } = playToMinute(
      aMatchInput().withHome(high).withAway(low).build(),
      4,
      45,
    ).state;

    expect(energy["h-6"]).toBeLessThan(energy["a-6"] ?? 0);
  });

  it("drains a high work rate player faster than a low one at the same position", () => {
    const hard = anEnginePlayer("h-6").withPosition("MID").withAttribute("workRate", 20).build();
    const home = aTeamSheet("Home", "h").build();
    const sheet = { ...home, starters: home.starters.map((p) => (p.id === "h-6" ? hard : p)) };
    const lazyId = "h-7";
    const lazy = anEnginePlayer(lazyId).withPosition("MID").withAttribute("workRate", 1).build();
    const starters = sheet.starters.map((p) => (p.id === lazyId ? lazy : p));

    const { energy } = playToMinute(
      aMatchInput()
        .withHome({ ...sheet, starters })
        .build(),
      5,
      45,
    ).state;

    expect(energy["h-6"]).toBeLessThan(energy["h-7"] ?? 0);
  });

  it("drains the planned amount in a minute for a neutral midfielder", () => {
    const { energy } = playToMinute(input, 6, 10).state;

    expect(energy["h-6"]).toBeCloseTo(ENERGY_START - 10 * BASE_DRAIN * 1.1, 6);
  });

  it("gives a substitute full energy and keeps the player taken off where he was", () => {
    const match = createActionMatch(input, 7, { detail: "fast" });
    match.advanceTo(30 * MINUTE);
    const before = match.state.energy["h-6"] ?? 0;
    const sub = input.home.bench[0];
    if (!sub) throw new Error("no bench");
    const lineup = input.home.starters.map((p) =>
      p.id === "h-6" ? { ...sub, position: p.position } : p,
    );

    match.applyChange({ side: "home", lineup });

    expect(match.state.energy[sub.id]).toBe(ENERGY_START);
    expect(match.state.energy["h-6"]).toBe(before);
    match.advanceTo(40 * MINUTE);
    expect(match.state.energy["h-6"]).toBe(before);
    expect(match.state.energy[sub.id]).toBeLessThan(ENERGY_START);
  });

  it("does not drain during half-time", () => {
    const match = createActionMatch(input, 8, { detail: "fast" });
    match.advanceTo(10_000);
    const atHalfTime = match.state.energy;
    match.resume();
    match.advanceTo(match.state.time + 5);

    const after = match.state.energy;
    for (const id of Object.keys(atHalfTime)) {
      expect((atHalfTime[id] ?? 0) - (after[id] ?? 0)).toBeLessThan(BASE_DRAIN * 1.5);
    }
  });

  it("gives the same energy however time is split", () => {
    const whole = createActionMatch(input, 9, { detail: "fast" });
    whole.advanceTo(2000);
    const split = createActionMatch(input, 9, { detail: "fast" });
    for (let t = 100; t <= 2000; t += 100) split.advanceTo(t);

    expect(split.state.energy).toEqual(whole.state.energy);
  });

  it("lowers a starter's mean effective attribute by roughly 4 to 8 percent over a whole match", () => {
    const match = createActionMatch(input, 10, { detail: "fast" });
    match.advanceTo(10_000);
    match.resume();
    match.advanceTo(20_000);

    const loss = 1 - energyFactor(match.state.energy["h-6"] ?? 0);

    expect(loss).toBeGreaterThan(0.04);
    expect(loss).toBeLessThan(0.08);
  });
});

describe("energy lowers performance", () => {
  const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1);
  const LAST_QUARTER_START = 75 * MINUTE;

  /** A home side that spends energy fast: high pressing, fast tempo, the hardest work rate. */
  const spendthrift = () => {
    const base = aMatchInput().build();
    const starters = base.home.starters.map((p) => ({
      ...p,
      attributes: { ...p.attributes, workRate: 20 },
    }));
    const tactics = { ...base.home.tactics, pressing: "high", tempo: "fast" } as const;
    return aMatchInput()
      .withHome({ ...base.home, starters, tactics })
      .build();
  };

  /** Shots of the home side in the last 15 minutes of a whole match, summed over the seeds. */
  const lateHomeShots = (input: MatchInput, energyPenalty: boolean | "home") =>
    SEEDS.reduce((total, seed) => {
      const match = createActionMatch(input, seed, { detail: "fast", energyPenalty });
      match.advanceTo(10_000);
      match.resume();
      match.advanceTo(20_000);
      const late = (e: (typeof match.events)[number]) =>
        e.type === "shot" && e.team === "home" && e.time >= LAST_QUARTER_START;
      return total + match.events.filter(late).length;
    }, 0);

  it("makes a tired team create fewer shots in the last 15 minutes than the same team with the penalty disabled", () => {
    const input = spendthrift();

    expect(lateHomeShots(input, "home")).toBeLessThan(lateHomeShots(input, false));
  });

  it("restores a side's performance when rested substitutes come on", () => {
    const input = aMatchInput().build();
    const bench = Array.from({ length: 11 }, (_, i) =>
      anEnginePlayer(`h-s${i}`)
        .withPosition(input.home.starters[i]?.position ?? "MID")
        .build(),
    );
    const withBench = aMatchInput()
      .withHome({ ...input.home, bench })
      .build();
    const lastQuarterShots = (substitute: boolean) =>
      SEEDS.reduce((total, seed) => {
        const match = createActionMatch(withBench, seed, { detail: "fast" });
        match.advanceTo(70 * MINUTE);
        if (substitute) match.applyChange({ side: "home", lineup: bench });
        match.advanceTo(10_000);
        match.resume();
        match.advanceTo(20_000);
        return (
          total +
          match.events.filter(
            (e) => e.type === "shot" && e.team === "home" && e.time >= LAST_QUARTER_START,
          ).length
        );
      }, 0);

    expect(lastQuarterShots(true)).toBeGreaterThan(lastQuarterShots(false));
  });

  it("reports the same energy with and without the penalty in the first minutes", () => {
    const input = aMatchInput().build();
    const on = createActionMatch(input, 3, { detail: "fast" });
    const off = createActionMatch(input, 3, { detail: "fast", energyPenalty: false });
    on.advanceTo(MINUTE);
    off.advanceTo(MINUTE);

    expect(on.state.energy).toEqual(off.state.energy);
  });
});
