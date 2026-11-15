import { describe, expect, it, vi } from "vitest";
import { aMatchInputV2 } from "./action-builders";
import { createActionMatch } from "./create-action-match";

vi.setConfig({ testTimeout: 60_000 });

const SEEDS = [1, 2, 3, 7, 11];
const REACH = 1.5;

const playFullMatch = (seed: number) => {
  const input = aMatchInputV2().build();
  const match = createActionMatch(input, seed);
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
  const slots = new Map<string, number>();
  for (const [slot, p] of [...input.home.starters, ...input.away.starters].entries()) {
    slots.set(p.id, slot);
  }
  return { events: match.events, slots };
};

describe("ball carrier in snapshots", () => {
  it.each(SEEDS)("keeps the actor of a pass, carry or shot on the ball (seed %s)", (seed) => {
    const { events, slots } = playFullMatch(seed);
    const far: string[] = [];
    let checked = 0;
    for (const e of events) {
      if (e.type !== "pass" && e.type !== "carry" && e.type !== "shot") continue;
      const slot = slots.get(e.actor ?? "");
      const p = slot === undefined ? undefined : e.snapshot?.players[slot];
      if (!p || !e.snapshot) continue;
      checked++;
      const d = Math.hypot(p.x - e.snapshot.ball.x, p.y - e.snapshot.ball.y);
      if (d > REACH) far.push(`${e.time}s ${e.type} ${d.toFixed(1)}m`);
    }
    expect(checked).toBeGreaterThan(500);
    expect(far).toEqual([]);
  });
});
