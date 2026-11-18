import { describe, expect, it } from "vitest";
import { aPlayer } from "./game-builders";
import { playerOverall } from "./player-overall";
import {
  effectiveRating,
  GOALKEEPER_SWAP_PENALTY,
  OUTFIELD_ONE_LINE_PENALTY,
  OUTFIELD_TWO_LINES_PENALTY,
  positionPenalty,
  positionRating,
} from "./position-rating";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];
const LINE: Record<PlayerPosition, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

const evenPlayer = (position: PlayerPosition) =>
  aPlayer().withPosition(position).withAllAttributes(12).build();

describe("positionPenalty", () => {
  it("is zero at the player's own position", () => {
    for (const position of POSITIONS) expect(positionPenalty(position, position)).toBe(0);
  });

  it("is small one line away and larger two lines away in the outfield", () => {
    expect(positionPenalty("DEF", "MID")).toBe(OUTFIELD_ONE_LINE_PENALTY);
    expect(positionPenalty("FWD", "MID")).toBe(OUTFIELD_ONE_LINE_PENALTY);
    expect(positionPenalty("DEF", "FWD")).toBe(OUTFIELD_TWO_LINES_PENALTY);
    expect(OUTFIELD_TWO_LINES_PENALTY).toBeGreaterThan(OUTFIELD_ONE_LINE_PENALTY);
  });

  it("is largest between goalkeeper and outfield, in both directions", () => {
    for (const outfield of ["DEF", "MID", "FWD"] as const) {
      expect(positionPenalty("GK", outfield)).toBe(GOALKEEPER_SWAP_PENALTY);
      expect(positionPenalty(outfield, "GK")).toBe(GOALKEEPER_SWAP_PENALTY);
    }
    expect(GOALKEEPER_SWAP_PENALTY).toBeGreaterThan(OUTFIELD_TWO_LINES_PENALTY);
  });

  it("is symmetric", () => {
    const pairs = POSITIONS.flatMap((a) => POSITIONS.map((b) => [a, b] as const));

    for (const [a, b] of pairs) expect(positionPenalty(a, b)).toBe(positionPenalty(b, a));
  });

  it("is never smaller further away (outfield lines)", () => {
    const outfield = ["DEF", "MID", "FWD"] as const;
    const triples = outfield.flatMap((from) =>
      outfield.flatMap((near) => outfield.map((far) => ({ from, near, far }))),
    );
    const distance = (a: PlayerPosition, b: PlayerPosition) => Math.abs(LINE[a] - LINE[b]);
    const furtherAway = triples.filter((t) => distance(t.from, t.far) >= distance(t.from, t.near));

    for (const { from, near, far } of furtherAway) {
      expect(positionPenalty(from, far)).toBeGreaterThanOrEqual(positionPenalty(from, near));
    }
  });
});

describe("positionRating", () => {
  it("leaves the rating unchanged at the player's own position", () => {
    for (const position of POSITIONS) {
      const player = evenPlayer(position);
      expect(positionRating(player, position)).toBe(playerOverall(player));
    }
  });

  it("lowers the rating by the penalty one line away", () => {
    const player = evenPlayer("FWD");
    expect(positionRating(player, "MID")).toBeCloseTo(12 * (1 - OUTFIELD_ONE_LINE_PENALTY));
  });

  it("is never better away from the own position for a player with equal attributes", () => {
    for (const own of POSITIONS) {
      const player = evenPlayer(own);
      for (const other of POSITIONS) {
        expect(positionRating(player, other)).toBeLessThanOrEqual(positionRating(player, own));
      }
    }
  });

  it("rates an outfielder in goal far below a goalkeeper of the same quality", () => {
    expect(positionRating(evenPlayer("FWD"), "GK")).toBeLessThan(
      positionRating(evenPlayer("GK"), "GK") * 0.6,
    );
  });

  it("never drops below the minimum attribute value", () => {
    const player = aPlayer().withPosition("FWD").withAllAttributes(1).build();
    expect(positionRating(player, "GK")).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic", () => {
    const player = evenPlayer("DEF");
    expect(positionRating(player, "FWD")).toBe(positionRating(player, "FWD"));
  });
});

describe("effectiveRating", () => {
  it("equals the position rating of a fully fit player in neutral form", () => {
    const player = evenPlayer("MID");
    expect(effectiveRating(player, "MID", { fitness: 100, form: 5 })).toBeCloseTo(12, 10);
  });

  it("is lower for a tired player and higher for a player in good form", () => {
    const player = evenPlayer("DEF");
    const fit = effectiveRating(player, "DEF", { fitness: 100, form: 5 });
    expect(effectiveRating(player, "DEF", { fitness: 40, form: 5 })).toBeLessThan(fit);
    expect(effectiveRating(player, "DEF", { fitness: 100, form: 9 })).toBeGreaterThan(fit);
  });

  it("applies the position penalty on top of fitness and form, as the engine does", () => {
    const player = evenPlayer("DEF");
    const condition = { fitness: 60, form: 5 };
    const own = effectiveRating(player, "DEF", condition);
    expect(effectiveRating(player, "MID", condition)).toBeCloseTo(
      own * (1 - OUTFIELD_ONE_LINE_PENALTY),
      10,
    );
  });
});
