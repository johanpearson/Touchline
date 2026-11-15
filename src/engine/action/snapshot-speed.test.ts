import { describe, expect, it, vi } from "vitest";
import { aMatchInputV2 } from "./action-builders";
import { createActionMatch } from "./create-action-match";
import { MAX_SNAPSHOT_SPEED } from "./loop-constants";

vi.setConfig({ testTimeout: 60_000 });

/** The ceiling the acceptance criterion names; the engine's own limit must stay below it. */
const MAX_PLAYER_SPEED = 12;
const SEEDS = [1, 2, 3, 7, 11];

const playFullMatch = (seed: number) => {
  const match = createActionMatch(aMatchInputV2().build(), seed);
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
  return match.events;
};

describe("snapshot player speed", () => {
  it("keeps the engine limit below the 12 m/s ceiling", () => {
    expect(MAX_SNAPSHOT_SPEED).toBeLessThanOrEqual(MAX_PLAYER_SPEED);
  });

  it.each(SEEDS)("never moves a player faster than 12 m/s between snapshots (seed %s)", (seed) => {
    const events = playFullMatch(seed);
    let fastest = 0;
    for (let i = 1; i < events.length; i++) {
      const previous = events[i - 1];
      const current = events[i];
      if (!previous?.snapshot || !current?.snapshot) continue;
      if (current.type === "setPiece" || current.type === "periodChange") continue;
      const seconds = current.time - previous.time;
      expect(seconds).toBeGreaterThan(0);
      current.snapshot.players.forEach((p, slot) => {
        const from = previous.snapshot?.players[slot];
        if (from) fastest = Math.max(fastest, Math.hypot(p.x - from.x, p.y - from.y) / seconds);
      });
    }
    expect(fastest).toBeLessThanOrEqual(MAX_PLAYER_SPEED);
  });
});
