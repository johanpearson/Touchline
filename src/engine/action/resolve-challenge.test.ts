import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import {
  FOUL_MAX,
  FOUL_MIN,
  PENALTY_AREA_FOUL_FACTOR,
  TACKLE_WIN_MAX,
  TACKLE_WIN_MIN,
} from "./decision-constants";
import { type ChallengeInput, foulChance, resolveChallenge } from "./resolve-challenge";

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

  it("makes defenders more careful in their own penalty area", () => {
    const outside = foulChance(anEnginePlayer("t").build());

    expect(
      resolveChallenge(input({ point: at(95, 34) }), scripted(outside * 0.9)).outcome,
    ).not.toBe("foul");
    expect(
      resolveChallenge(input({ point: at(95, 34) }), scripted(outside * 0.9)).outcome,
    ).not.toBe("foul");
    expect(
      resolveChallenge(
        input({ point: at(95, 34) }),
        scripted(outside * PENALTY_AREA_FOUL_FACTOR * 0.9),
      ).outcome,
    ).toBe("foul");
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

  it("clamps the foul chance to named bounds", () => {
    const best = player(20, 20);
    const worst = player(1, 1);
    expect(foulChance(best)).toBeGreaterThanOrEqual(FOUL_MIN);
    expect(foulChance(worst)).toBeLessThanOrEqual(FOUL_MAX);
    expect(foulChance(worst)).toBeGreaterThan(foulChance(best));
    const edge = foulChance(worst);
    expect(resolveChallenge(input({ tackler: worst }), scripted(edge - 0.001)).outcome).toBe(
      "foul",
    );
    expect(resolveChallenge(input({ tackler: worst }), scripted(edge + 0.001)).outcome).not.toBe(
      "foul",
    );
    expect(
      resolveChallenge(input({ tackler: best }), scripted(foulChance(best) - 0.001)).outcome,
    ).toBe("foul");
    expect(
      resolveChallenge(input({ tackler: best }), scripted(foulChance(best) + 0.001)).outcome,
    ).not.toBe("foul");
  });

  it("floors the chance to win the ball", () => {
    const weakest = input({
      tackler: player(1, 1),
      carrier: anEnginePlayer("c")
        .withAttribute("dribbling", 20)
        .withAttribute("strength", 20)
        .build(),
    });
    const pFoul = foulChance(player(1, 1));
    const edge = pFoul + (1 - pFoul) * TACKLE_WIN_MIN;
    expect(resolveChallenge(weakest, scripted(edge - 0.001)).outcome).toBe("won");
    expect(resolveChallenge(weakest, scripted(edge + 0.001)).outcome).toBe("lost");
  });

  it("caps the chance to win the ball", () => {
    const strongest = input({
      tackler: player(20, 20),
      carrier: anEnginePlayer("c")
        .withAttribute("dribbling", 1)
        .withAttribute("strength", 1)
        .build(),
    });
    const pFoul = foulChance(player(20, 20));
    const edge = pFoul + (1 - pFoul) * TACKLE_WIN_MAX;
    expect(resolveChallenge(strongest, scripted(edge - 0.001)).outcome).toBe("won");
    expect(resolveChallenge(strongest, scripted(edge + 0.001)).outcome).toBe("lost");
  });
});
