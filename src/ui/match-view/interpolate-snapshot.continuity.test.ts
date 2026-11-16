import { describe, expect, it } from "vitest";
import { createActionMatch } from "../../engine";
import { anActionMatchSetup } from "./action-match-fixture";
import { interpolateSnapshot } from "./interpolate-snapshot";
import { SPEEDS } from "./playback";

/**
 * The fastest a player may move on screen between two frames, in metres per match second, outside
 * snaps. Real players sprint at about 10 m/s; the engine caps its snapshots at that pace
 * (`MAX_SNAPSHOT_SPEED`), so this allows a small margin for interpolation only.
 */
const MAX_PLAYER_SPEED = 12;
const FRAME_SECONDS = 1 / 60;

const playFullMatch = (seed: number) => {
  const { setup } = anActionMatchSetup(seed);
  const match = createActionMatch(setup.input, seed);
  while (match.state.period !== "fullTime") {
    match.advanceTo(match.state.time + 600);
    if (match.state.period === "halfTime") match.resume();
  }
  return match;
};

/** Whether a snap time falls in the frame `(from, to]`; `snapTimes` is sorted ascending. */
const hasSnapIn = (snapTimes: readonly number[], from: number, to: number): boolean => {
  let low = 0;
  let high = snapTimes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((snapTimes[middle] ?? 0) <= from) low = middle + 1;
    else high = middle;
  }
  return low < snapTimes.length && (snapTimes[low] ?? Infinity) <= to;
};

describe("interpolateSnapshot playback", () => {
  const match = playFullMatch(7);
  const events = match.events;
  // Looked up once: scanning `events` for every frame made this test load sensitive on CI (#211).
  const snapTimes = events
    .filter((e) => e.type === "setPiece" || e.type === "periodChange")
    .map((e) => e.time)
    .sort((a, b) => a - b);

  it("finds the snap events of the match", () => {
    expect(snapTimes.length).toBeGreaterThan(0);
  });

  it.each(SPEEDS)("moves players continuously at %s match seconds per second", (speed) => {
    const step = speed * FRAME_SECONDS;
    let fastest = 0;
    let previous = interpolateSnapshot(events, 0);
    for (let time = step; time < match.state.time; time += step) {
      const current = interpolateSnapshot(events, time);
      if (previous && current && !hasSnapIn(snapTimes, time - step, time)) {
        current.players.forEach((p, i) => {
          const from = previous?.players[i];
          const moved = Math.hypot(p.x - (from?.x ?? p.x), p.y - (from?.y ?? p.y)) / step;
          if (moved > fastest) fastest = moved;
        });
      }
      previous = current;
    }
    expect(fastest).toBeLessThanOrEqual(MAX_PLAYER_SPEED);
  });
});
