import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { SNAPSHOT_PLAYER_COUNT } from "../action/action-event";
import { inPitch } from "../action/pitch-metres";
import { toPhases } from "../action/to-phases";
import { aChance, aStep } from "./phase-builders";
import { toActionEvents } from "./to-action-events";

const sheets = { home: aTeamSheet("Home", "h").build(), away: aTeamSheet("Away", "a").build() };
const options = { sheets };

describe("toActionEvents", () => {
  it("opens a restart step with the set piece and passes along the chain", () => {
    const events = toActionEvents([aStep().build()], 1, options);

    expect(events[0]).toMatchObject({ type: "setPiece", variant: "kickoff", actor: "h1" });
    const passes = events.filter((e) => e.type === "pass");
    expect(passes.map((p) => [p.actor, p.type === "pass" ? p.target : ""])).toEqual([
      ["h1", "h2"],
      ["h2", "h3"],
    ]);
  });

  it("ends a lost possession with the action that gives the ball away", () => {
    const tackled = toActionEvents([aStep().endingLost("tackle", "a2").build()], 1, options);
    const intercepted = toActionEvents(
      [aStep().endingLost("interception", "a3").build()],
      1,
      options,
    );

    expect(tackled.at(-1)).toMatchObject({ type: "carry", outcome: "tackled", opponent: "a2" });
    expect(intercepted.at(-1)).toMatchObject({
      type: "pass",
      outcome: "intercepted",
      opponent: "a3",
    });
  });

  it("turns a chance into a shot by the last player of the chain with the chance's xg", () => {
    const chance = aChance().withResult("goal").withXg(0.31).build();
    const events = toActionEvents([aStep().endingInChance(chance).build()], 1, options);

    expect(events.at(-1)).toMatchObject({
      type: "shot",
      actor: "h3",
      opponent: "a1",
      outcome: "goal",
      xg: 0.31,
    });
  });

  it.each([
    ["saved", "saved"],
    ["woodwork", "woodwork"],
    ["blocked", "blocked"],
    ["wide", "missed"],
    ["over", "missed"],
  ] as const)("maps the chance result %s to the shot outcome %s", (result, outcome) => {
    const chance = aChance().withResult(result).build();
    const events = toActionEvents([aStep().endingInChance(chance).build()], 1, options);

    expect(events.at(-1)).toMatchObject({ type: "shot", outcome });
  });

  it("marks the pass before a shot as a key pass and gives a cross its variant", () => {
    const chance = aChance().withKind("cross").build();
    const events = toActionEvents([aStep().endingInChance(chance).build()], 1, options);
    const lastPass = events.filter((e) => e.type === "pass").at(-1);

    expect(lastPass).toMatchObject({ variant: "cross", keyPass: true });
  });

  it("ends a fouled possession with the foul on the fouled side", () => {
    const events = toActionEvents([aStep().endingInFoul("a4", true).build()], 1, options);

    expect(events.at(-1)).toMatchObject({
      type: "foul",
      team: "home",
      opponent: "a4",
      outcome: "penalty",
    });
  });

  it("ends a possession that leaves the pitch with a ball out of play on the boundary", () => {
    const events = toActionEvents([aStep().endingOutOfPlay().build()], 1, options);
    const last = events.at(-1);

    expect(last).toMatchObject({ outcome: "outOfPlay" });
    expect(
      last && (last.to.y === 0 || last.to.y === 68 || last.to.x === 0 || last.to.x === 105),
    ).toBe(true);
  });

  it("closes a step cut by the whistle with the period change", () => {
    const step = aStep().during("firstHalf").between(2700, 2712).endingAtPeriodEnd().build();
    const events = toActionEvents([step], 1, options);

    expect(events.at(-1)).toMatchObject({ type: "periodChange", period: "halfTime", time: 2712 });
  });

  it("keeps every event inside the step's time span with times that never decrease", () => {
    const events = toActionEvents([aStep().between(100, 112.5).build()], 3, options);
    const times = events.map((e) => e.time);

    expect(Math.min(...times)).toBe(100);
    expect(Math.max(...times)).toBe(112.5);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("gives every event a 22-point snapshot with all players and the ball on the pitch", () => {
    const events = toActionEvents([aStep().build()], 5, options);

    for (const event of events) {
      expect(event.snapshot?.players).toHaveLength(SNAPSHOT_PLAYER_COUNT);
      expect(event.snapshot?.players.every(inPitch)).toBe(true);
      expect(event.snapshot && inPitch(event.snapshot.ball)).toBe(true);
    }
  });

  it("leaves out snapshots in fast detail without changing the actions", () => {
    const step = aStep().endingInChance().build();
    const full = toActionEvents([step], 9, options);
    const fast = toActionEvents([step], 9, { ...options, detail: "fast" });

    expect(fast.every((e) => e.snapshot === undefined)).toBe(true);
    expect(fast).toEqual(full.map(({ snapshot: _snapshot, ...rest }) => rest));
  });

  it("gives the same log for the same seed and a different one for another seed", () => {
    const steps = [aStep().build()];

    expect(toActionEvents(steps, 4, options)).toEqual(toActionEvents(steps, 4, options));
    expect(toActionEvents(steps, 4, options)).not.toEqual(toActionEvents(steps, 5, options));
  });

  it("expands every step into at least as many actions as a phase needs to stand alone", () => {
    const short = aStep()
      .startingWith("tackle")
      .withChain([
        { player: "h1", at: { x: 40, y: 34 } },
        { player: "h2", at: { x: 50, y: 34 } },
      ])
      .build();

    expect(toActionEvents([short], 1, options).length).toBeGreaterThanOrEqual(3);
  });

  it("gives phases back that match the steps' boundaries", () => {
    const steps = [
      aStep().between(0, 14.2).endingLost("tackle").build(),
      aStep().forTeam("away").startingWith("tackle").between(14.2, 30).endingOutOfPlay().build(),
      aStep()
        .startingWith("throwIn")
        .between(35, 52)
        .endingInChance(aChance().withResult("goal").build())
        .build(),
    ];

    const phases = toPhases(toActionEvents(steps, 2, options));

    expect(phases.map((p) => [p.team, p.startTime, p.endTime, p.outcome])).toEqual([
      ["home", 0, 14.2, "turnover"],
      ["away", 14.2, 30, "outOfPlay"],
      ["home", 35, 52, "goal"],
    ]);
  });
});
