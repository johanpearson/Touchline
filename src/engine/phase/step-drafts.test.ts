import { describe, expect, it } from "vitest";
import { PITCH_LENGTH, PITCH_WIDTH } from "../action/pitch-metres";
import type { Rng } from "../rng";
import { aChance, aStep } from "./phase-builders";
import type { ChainLink } from "./phase-step";
import { draftsOf, MIN_STEP_ACTIONS } from "./step-drafts";

/** An Rng that returns `values` from `next` in order and 0.5 afterwards. */
const scripted = (...values: number[]): Rng => {
  let index = 0;
  const next = (): number => values[index++] ?? 0.5;
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)] as never,
    chance: (p) => next() < p,
    fork: () => rng,
  };
  return rng;
};

const link = (player: string, x: number, y: number): ChainLink => ({ player, at: { x, y } });
const chain3 = [link("h1", 30, 34), link("h2", 50, 30), link("h3", 80, 36)] as const;
const drafts = (step: ReturnType<ReturnType<typeof aStep>["build"]>, rng = scripted()) =>
  draftsOf(step, rng);

describe("draftsOf: the build-up", () => {
  it("opens a restart with the taker's set piece and an open-play start with nothing", () => {
    const kickoff = drafts(aStep().startingWith("kickoff").build())[0];
    const open = drafts(aStep().startingWith("tackle").build())[0];

    expect(kickoff).toMatchObject({
      type: "setPiece",
      team: "home",
      period: "firstHalf",
      actor: "h1",
      variant: "kickoff",
      outcome: "taken",
      from: { x: 30, y: 34 },
      to: { x: 30, y: 34 },
    });
    expect(open?.type).toBe("pass");
  });

  it.each(["goalKick", "throwIn", "corner", "freeKick", "penalty"] as const)(
    "treats a %s start as a restart",
    (start) => {
      expect(drafts(aStep().startingWith(start).build())[0]).toMatchObject({
        type: "setPiece",
        variant: start,
      });
    },
  );

  it("passes between consecutive links, completed, from where the passer was to where the receiver is", () => {
    const passes = drafts(aStep().startingWith("tackle").withChain(chain3).build()).filter(
      (d) => d.type === "pass" && d.outcome === "complete",
    );

    expect(passes).toHaveLength(2);
    expect(passes[0]).toMatchObject({
      actor: "h1",
      target: "h2",
      from: { x: 30, y: 34 },
      to: { x: 50, y: 30 },
      team: "home",
      period: "firstHalf",
    });
    expect(passes[1]).toMatchObject({ actor: "h2", target: "h3" });
  });

  it("calls a pass long only above 30 metres", () => {
    const chain = [link("h1", 0, 0), link("h2", 30, 0), link("h3", 60.5, 0)] as const;
    const passes = drafts(aStep().startingWith("tackle").withChain(chain).build()).filter(
      (d) => d.type === "pass" && d.outcome === "complete",
    );

    expect(passes.map((p) => (p as { variant: string }).variant)).toEqual(["short", "long"]);
  });

  it.each([
    ["cross", "cross"],
    ["throughBall", "through"],
  ] as const)("makes the pass that creates a %s chance a %s", (kind, variant) => {
    const step = aStep()
      .startingWith("tackle")
      .withChain(chain3)
      .endingInChance(aChance().withKind(kind).build())
      .build();
    const passes = drafts(step).filter((d) => d.type === "pass");

    expect((passes[0] as { variant: string }).variant).toBe("short");
    expect((passes[1] as { variant: string }).variant).toBe(variant);
  });

  it("keeps an ordinary pass for the other chance kinds", () => {
    const step = aStep()
      .startingWith("tackle")
      .withChain(chain3)
      .endingInChance(aChance().withKind("openPlay").build())
      .build();

    // the pass is 30.6 m, so it is an ordinary long pass
    expect((drafts(step).filter((d) => d.type === "pass")[1] as { variant: string }).variant).toBe(
      "long",
    );
  });

  it("adds a short carry by a receiver after a pass, 3 to 8 metres forward, but not after the last pass", () => {
    // pass 1: carry draw 0.1 (< 0.25) then 0.5 for the distance; pass 2: carry draw 0.1 but it is the last pass
    const list = drafts(
      aStep().startingWith("tackle").withChain(chain3).build(),
      scripted(0.1, 0.5, 0.1),
    );
    const carries = list.filter((d) => d.type === "carry" && d.outcome === "kept");

    expect(carries).toHaveLength(1);
    expect(carries[0]).toMatchObject({
      actor: "h2",
      from: { x: 50, y: 30 },
      to: { x: 50 + 3 + 0.5 * 5, y: 30 },
    });
    expect(list.map((d) => d.type).slice(0, 3)).toEqual(["pass", "carry", "pass"]);
  });

  it("carries towards x = 0 for the away side and stays on the pitch", () => {
    const away = [link("a1", 80, 34), link("a2", 60, 34), link("a3", 3, 34)] as const;
    const list = drafts(
      aStep().forTeam("away").startingWith("tackle").withChain(away).build(),
      scripted(0.1, 0.999),
    );
    const carry = list.find((d) => d.type === "carry" && d.outcome === "kept");

    expect((carry as { to: { x: number } }).to.x).toBeCloseTo(60 - 3 - 0.999 * 5, 6);

    const edge = [link("h1", 99, 34), link("h2", 104, 34), link("h3", 104, 30)] as const;
    const clamped = drafts(
      aStep().startingWith("tackle").withChain(edge).build(),
      scripted(0.1, 0.999),
    ).find((d) => d.type === "carry" && d.outcome === "kept");
    expect((clamped as { to: { x: number } }).to.x).toBe(PITCH_LENGTH);
  });
});

describe("draftsOf: the closing event", () => {
  const last = (step: Parameters<typeof draftsOf>[0], rng = scripted()) =>
    draftsOf(step, rng).at(-1);

  it.each([
    ["goal", "goal"],
    ["saved", "saved"],
    ["woodwork", "woodwork"],
    ["blocked", "blocked"],
    ["wide", "missed"],
    ["over", "missed"],
  ] as const)("ends a chance that is %s with a shot that is %s", (result, outcome) => {
    const chance = aChance().withResult(result).withXg(0.37).build();
    const shot = last(aStep().withChain(chain3).endingInChance(chance).build());

    expect(shot).toMatchObject({
      type: "shot",
      team: "home",
      actor: "h3",
      opponent: "a1",
      outcome,
      xg: 0.37,
      from: chance.from,
    });
  });

  it("aims the shot at the goal being attacked, within the posts", () => {
    const home = last(aStep().endingInChance().build(), scripted(0.5, 0.5, 0.5)) as {
      to: { x: number; y: number };
    };
    const away = last(
      aStep().forTeam("away").endingInChance().build(),
      scripted(0.5, 0.5, 0.999),
    ) as {
      to: { x: number; y: number };
    };
    const low = last(aStep().endingInChance().build(), scripted(0.5, 0.5, 0)) as {
      to: { y: number };
    };

    expect(home.to.x).toBe(PITCH_LENGTH);
    expect(away.to.x).toBe(0);
    expect(low.to.y).toBeCloseTo(PITCH_WIDTH / 2 - 3.66, 6);
    expect(away.to.y).toBeLessThanOrEqual(PITCH_WIDTH / 2 + 3.66);
  });

  it("ends a tackle with a tackled carry by the last player, 2 metres forward", () => {
    const end = last(aStep().withChain(chain3).endingLost("tackle", "a5").build());

    expect(end).toMatchObject({
      type: "carry",
      outcome: "tackled",
      actor: "h3",
      opponent: "a5",
      from: { x: 80, y: 36 },
      to: { x: 82, y: 36 },
    });
  });

  it.each([
    ["interception", "intercepted"],
    ["badPass", "incomplete"],
  ] as const)("ends a %s with a %s pass towards the first player's side", (how, outcome) => {
    const end = last(
      aStep().withChain(chain3).endingLost(how, "a7").build(),
      scripted(0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5),
    ) as {
      to: { x: number };
    };

    expect(end).toMatchObject({
      type: "pass",
      outcome,
      actor: "h3",
      target: "h1",
      opponent: "a7",
      variant: "short",
      from: { x: 80, y: 36 },
    });
    expect(end.to.x).toBeGreaterThanOrEqual(88);
    expect(end.to.x).toBeLessThanOrEqual(98);
  });

  it("draws the length of a lost pass between 8 and 18 metres", () => {
    const short = draftsOf(
      aStep().withChain(chain3).endingLost("badPass").build(),
      scripted(0.5, 0.5, 0),
    ).at(-1);
    const long = draftsOf(
      aStep().withChain(chain3).endingLost("badPass").build(),
      scripted(0.5, 0.5, 0.999),
    ).at(-1);

    expect((short as { to: { x: number } }).to.x).toBeCloseTo(88, 0);
    expect((long as { to: { x: number } }).to.x).toBeCloseTo(98, 0);
  });

  it("ends out of play at the nearer touchline", () => {
    const north = last(
      aStep()
        .withChain([link("h1", 30, 34), link("h2", 80, 10)])
        .endingOutOfPlay()
        .build(),
    );
    const south = last(aStep().withChain(chain3).endingOutOfPlay().build());
    const middle = last(
      aStep()
        .withChain([link("h1", 30, 34), link("h2", 60, 34)])
        .endingOutOfPlay()
        .build(),
    );
    const farSide = last(
      aStep()
        .withChain([link("h1", 30, 34), link("h2", 60, 50)])
        .endingOutOfPlay()
        .build(),
    );

    expect(north).toMatchObject({ type: "carry", outcome: "outOfPlay", to: { x: 80, y: 0 } });
    expect(south).toMatchObject({ to: { x: 80, y: PITCH_WIDTH } });
    expect(middle).toMatchObject({ to: { x: 60, y: PITCH_WIDTH } });
    expect(farSide).toMatchObject({ to: { x: 60, y: PITCH_WIDTH } });
  });

  it.each([
    [false, "freeKick"],
    [true, "penalty"],
  ] as const)("ends a foul (penalty %s) with a %s on the offender", (penalty, outcome) => {
    expect(last(aStep().withChain(chain3).endingInFoul("a9", penalty).build())).toMatchObject({
      type: "foul",
      actor: "h3",
      opponent: "a9",
      outcome,
      from: { x: 80, y: 36 },
      to: { x: 80, y: 36 },
    });
  });

  it.each([
    ["firstHalf", "halfTime"],
    ["secondHalf", "fullTime"],
    ["halfTime", "fullTime"],
    ["fullTime", "fullTime"],
  ] as const)("ends %s with a period change to %s", (period, next) => {
    expect(last(aStep().during(period).endingAtPeriodEnd().build())).toEqual({
      type: "periodChange",
      team: "home",
      period: next,
      from: { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 },
      to: { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 },
    });
  });
});

describe("draftsOf: padding", () => {
  const single = [link("h1", 40, 20)] as const;
  const count = (step: Parameters<typeof draftsOf>[0]) => draftsOf(step, scripted()).length;

  it("pads a short loss to the minimum number of actions", () => {
    const list = draftsOf(aStep().startingWith("tackle").withChain(single).build(), scripted());

    expect(list).toHaveLength(MIN_STEP_ACTIONS);
    expect(list[0]).toMatchObject({
      type: "carry",
      outcome: "kept",
      actor: "h1",
      from: { x: 40, y: 20 },
      to: { x: 44, y: 20 },
    });
    expect(list.at(-1)?.type).toBe("carry");
  });

  it("counts the restart as an action", () => {
    expect(count(aStep().startingWith("kickoff").withChain(single).build())).toBe(MIN_STEP_ACTIONS);
    expect(
      draftsOf(aStep().startingWith("kickoff").withChain(single).build(), scripted())[0]?.type,
    ).toBe("setPiece");
  });

  it("needs one action fewer before a period end, which has no closing play", () => {
    const step = aStep().startingWith("tackle").withChain(single).endingAtPeriodEnd().build();

    expect(count(step)).toBe(MIN_STEP_ACTIONS + 1);
  });

  it("never pads a chance", () => {
    const step = aStep().startingWith("tackle").withChain(single).endingInChance().build();

    expect(draftsOf(step, scripted())).toHaveLength(1);
  });

  it("pads nothing when the build-up is long enough", () => {
    expect(count(aStep().startingWith("tackle").withChain(chain3).build())).toBe(3);
  });

  it("pads backwards for the away side", () => {
    const list = draftsOf(
      aStep()
        .forTeam("away")
        .startingWith("tackle")
        .withChain([link("a1", 40, 20)])
        .build(),
      scripted(),
    );

    expect((list[0] as { to: { x: number } }).to.x).toBe(36);
  });
});
