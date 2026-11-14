import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import { type ChallengeInput, resolveChallenge } from "./resolve-challenge";

const scripted = (value: number) => ({ ...createRng(1), next: () => value });
const at = (x: number, y = 34) => ({ x, y });
const player = (tackling: number, strength = 10) =>
  anEnginePlayer("t")
    .withAttribute("tackling", tackling)
    .withAttribute("strength", strength)
    .build();
const input = (extra: Partial<ChallengeInput> = {}): ChallengeInput => ({
  carrierSide: "home",
  carrierSlot: 6,
  carrier: anEnginePlayer("c").build(),
  tacklerSlot: 4,
  tackler: anEnginePlayer("t").build(),
  point: at(60),
  pressure: 0,
  ...extra,
});

describe("resolveChallenge", () => {
  it("is a foul on a low draw, giving the carrier's side a free kick where it happened", () => {
    const r = resolveChallenge(input(), scripted(0.01));
    expect(r.outcome).toBe("foul");
    expect(r.restart).toEqual({ team: "home", variant: "freeKick", position: at(60) });
    expect(r.possession).toEqual({ side: "home" });
  });

  it("is a penalty when the carrier is fouled in the attacked penalty area", () => {
    expect(resolveChallenge(input({ point: at(95, 34) }), scripted(0.01)).restart?.variant).toBe(
      "penalty",
    );
    expect(
      resolveChallenge(input({ point: at(95, 34), carrierSide: "away" }), scripted(0.01)).restart
        ?.variant,
    ).toBe("freeKick");
    expect(
      resolveChallenge(input({ carrierSide: "away", point: at(10, 34) }), scripted(0.01)).restart
        ?.variant,
    ).toBe("penalty");
    expect(resolveChallenge(input({ point: at(95, 10) }), scripted(0.01)).restart?.variant).toBe(
      "freeKick",
    );
  });

  it("is won by the tackler on a middle draw, who gets the ball at the carrier's position", () => {
    const r = resolveChallenge(input(), scripted(0.3));
    expect(r).toEqual({ outcome: "won", ball: at(60), possession: { side: "away", slot: 4 } });
  });

  it("is lost on a high draw, the carrier keeping the ball", () => {
    const r = resolveChallenge(input(), scripted(0.95));
    expect(r).toEqual({ outcome: "lost", ball: at(60), possession: { side: "home", slot: 6 } });
  });

  it("is won more often by a better tackler and under more pressure", () => {
    expect(resolveChallenge(input(), scripted(0.6)).outcome).toBe("lost");
    expect(resolveChallenge(input({ tackler: player(20, 20) }), scripted(0.6)).outcome).toBe("won");
    expect(resolveChallenge(input({ pressure: 1 }), scripted(0.6)).outcome).toBe("won");
  });

  it("fouls less often with a better tackler", () => {
    expect(resolveChallenge(input(), scripted(0.1)).outcome).toBe("foul");
    expect(resolveChallenge(input({ tackler: player(20, 20) }), scripted(0.1)).outcome).not.toBe(
      "foul",
    );
  });

  it("clamps the foul and win chances to named bounds", () => {
    expect(resolveChallenge(input({ tackler: player(20, 20) }), scripted(0.019)).outcome).toBe(
      "foul",
    );
    expect(resolveChallenge(input({ tackler: player(20, 20) }), scripted(0.021)).outcome).not.toBe(
      "foul",
    );
    expect(resolveChallenge(input({ tackler: player(1, 1) }), scripted(0.279)).outcome).toBe(
      "foul",
    );
    expect(resolveChallenge(input({ tackler: player(1, 1) }), scripted(0.281)).outcome).not.toBe(
      "foul",
    );
    const weakest = input({
      tackler: player(1, 1),
      carrier: anEnginePlayer("c")
        .withAttribute("dribbling", 20)
        .withAttribute("strength", 20)
        .build(),
    });
    expect(resolveChallenge(weakest, scripted(0.28 + 0.72 * 0.1 - 0.001)).outcome).toBe("won");
    expect(resolveChallenge(weakest, scripted(0.28 + 0.72 * 0.1 + 0.001)).outcome).toBe("lost");
  });

  it("caps the chance to win the ball", () => {
    const strongest = input({
      tackler: player(20, 20),
      carrier: anEnginePlayer("c")
        .withAttribute("dribbling", 1)
        .withAttribute("strength", 1)
        .build(),
    });
    expect(resolveChallenge(strongest, scripted(0.02 + 0.98 * 0.8 - 0.001)).outcome).toBe("won");
    expect(resolveChallenge(strongest, scripted(0.02 + 0.98 * 0.8 + 0.001)).outcome).toBe("lost");
  });
});
