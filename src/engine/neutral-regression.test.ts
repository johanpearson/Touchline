import { describe, expect, it } from "vitest";
import { createMatch } from "./create-match";
import fixtures from "./fixtures/neutral-event-logs.json";
import { aMatchInput, aTeamProfile } from "./match-builders";
import { NEUTRAL_TACTICS } from "./tactics";

/**
 * The logs in `fixtures/neutral-event-logs.json` were recorded with the engine before tactics
 * existed. Neutral tactics must reproduce them exactly. Never regenerate this fixture.
 */
const inputs = {
  average: aMatchInput().build(),
  mismatch: aMatchInput()
    .withHome(aTeamProfile("H").withAllRatings(0.65).build())
    .withAway(aTeamProfile("A").withAllRatings(0.4).build())
    .build(),
};

const playFull = (name: keyof typeof inputs, seed: number) => {
  const match = createMatch(
    { ...inputs[name], homeTactics: NEUTRAL_TACTICS, awayTactics: NEUTRAL_TACTICS },
    seed,
  );
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match.events;
};

describe("neutral tactics", () => {
  const cases = Object.keys(fixtures) as (keyof typeof fixtures)[];

  it.each(cases)("reproduce the recorded event log %s exactly", (key) => {
    const [name, seed] = key.split("-") as [keyof typeof inputs, string];

    expect(playFull(name, Number(seed))).toEqual(fixtures[key]);
  });
});
