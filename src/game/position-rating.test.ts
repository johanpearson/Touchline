import { describe, expect, it } from "vitest";
import { aPlayer } from "./game-builders";
import { playerOverall } from "./player-overall";
import {
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

  it("is symmetric and never smaller further away (outfield lines)", () => {
    for (const a of POSITIONS) {
      for (const b of POSITIONS) expect(positionPenalty(a, b)).toBe(positionPenalty(b, a));
    }
    const outfield = ["DEF", "MID", "FWD"] as const;
    for (const from of outfield) {
      for (const near of outfield) {
        for (const far of outfield) {
          if (Math.abs(LINE[far] - LINE[from]) >= Math.abs(LINE[near] - LINE[from])) {
            expect(positionPenalty(from, far)).toBeGreaterThanOrEqual(positionPenalty(from, near));
          }
        }
      }
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
