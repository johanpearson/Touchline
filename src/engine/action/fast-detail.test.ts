import { describe, expect, it, vi } from "vitest";
import { createRng } from "../rng";
import { aMatchInputV2, aTeamSheet } from "./action-builders";
import type { ActionEvent } from "./action-event";
import { createActionMatch } from "./create-action-match";
import type { MatchInputV2 } from "./match-input-v2";
import { kickoffPlay, playAction } from "./play-action";

vi.setConfig({ testTimeout: 60_000 });

const withoutSnapshot = (event: ActionEvent) => {
  const { snapshot: _snapshot, ...rest } = event;
  return rest;
};

const inputs: Record<string, MatchInputV2> = {
  neutral: aMatchInputV2().build(),
  threeFiveTwo: aMatchInputV2()
    .withHome(
      aTeamSheet("Home", "h").withFormation({ defenders: 3, midfielders: 5, forwards: 2 }).build(),
    )
    .build(),
  attackingAway: aMatchInputV2()
    .withAway({
      ...aTeamSheet("Away", "a").build(),
      tactics: { mentality: "attacking", pressing: "high", width: "wide", tempo: "fast" },
    })
    .build(),
};

const play = (input: MatchInputV2, seed: number, detail: "fast" | "full", fullMatch: boolean) => {
  const match = createActionMatch(input, seed, { detail });
  match.advanceTo(10_000);
  if (fullMatch) {
    match.resume();
    match.advanceTo(20_000);
  }
  return match;
};

describe("createActionMatch with detail", () => {
  it("builds snapshots by default and with detail full", () => {
    const byDefault = createActionMatch(inputs.neutral as MatchInputV2, 1);
    const full = createActionMatch(inputs.neutral as MatchInputV2, 1, { detail: "full" });

    expect(byDefault.events.every((e) => e.snapshot?.players.length === 22)).toBe(true);
    expect(full.events).toEqual(byDefault.events);
  });

  it("builds no snapshots with detail fast", () => {
    const match = play(inputs.neutral as MatchInputV2, 1, "fast", true);

    expect(match.events.length).toBeGreaterThan(1000);
    expect(match.events.some((e) => e.snapshot !== undefined)).toBe(false);
  });

  it("gives the same first half as full detail for 200 seeds", () => {
    const list = Object.values(inputs);
    for (let seed = 1; seed <= 200; seed++) {
      const input = list[seed % list.length] as MatchInputV2;
      const fast = play(input, seed, "fast", false);
      const full = play(input, seed, "full", false);

      expect(fast.events).toEqual(full.events.map(withoutSnapshot));
      expect(fast.state).toEqual(full.state);
    }
  });

  it.each(Object.keys(inputs))("gives the same whole match as full detail for %s", (name) => {
    const input = inputs[name] as MatchInputV2;
    const fast = play(input, 77, "fast", true);
    const full = play(input, 77, "full", true);

    expect(fast.events).toEqual(full.events.map(withoutSnapshot));
    expect(fast.state).toEqual(full.state);
  });

  it("does not let the presentation stream affect decisions", () => {
    const input = inputs.neutral as MatchInputV2;
    const run = (presentationSeed: number) => {
      const sim = createRng(5).fork("action-sim");
      const presentation = createRng(presentationSeed);
      let state = kickoffPlay("home", { home: 0, away: 0 }, { home: 0, away: 0 });
      const events: ActionEvent[] = [];
      let time = 0;
      for (let i = 0; i < 300; i++) {
        const result = playAction({
          input,
          play: state,
          time,
          period: "firstHalf",
          sim,
          presentation,
        });
        events.push(...result.events);
        state = result.play;
        time += result.duration;
      }
      return events.map(withoutSnapshot);
    };

    expect(run(1)).toEqual(run(999));
  });
});
