import { describe, expect, it } from "vitest";
import { createMatch } from "../../engine";
import { anActionMatchSetup } from "./action-match-fixture";
import { interpolateSnapshot } from "./interpolate-snapshot";
import { SPEEDS } from "./playback";

/**
 * The fastest a player may move on screen between two frames, in metres per match second, outside
 * snaps. Real players sprint at about 10 m/s; the engine's snapshots are only positions at action
 * moments and reach about 33 m/s between close events, so this ceiling catches teleporting, not
 * unrealistic pace.
 */
const MAX_PLAYER_SPEED = 40;
const FRAME_SECONDS = 1 / 60;

const playFullMatch = (seed: number) => {
  const { setup } = anActionMatchSetup(seed);
  const match = createMatch(setup.input, seed);
  while (match.state.period !== "fullTime") {
    match.advanceTo(match.state.time + 600);
    if (match.state.period === "halfTime") match.resume();
  }
  return match;
};

describe("interpolateSnapshot playback", () => {
  const match = playFullMatch(7);
  const events = match.events;

  it.each(SPEEDS)("moves players continuously at %s match seconds per second", (speed) => {
    const step = speed * FRAME_SECONDS;
    let previous = interpolateSnapshot(events, 0);
    for (let time = step; time < match.state.time; time += step) {
      const current = interpolateSnapshot(events, time);
      const snapped = events.some(
        (e) =>
          e.time > time - step &&
          e.time <= time &&
          (e.type === "setPiece" || e.type === "periodChange"),
      );
      if (!snapped && previous && current) {
        current.players.forEach((p, i) => {
          const from = previous?.players[i];
          const moved = Math.hypot(p.x - (from?.x ?? p.x), p.y - (from?.y ?? p.y)) / step;
          expect(moved).toBeLessThanOrEqual(MAX_PLAYER_SPEED);
        });
      }
      previous = current;
    }
  });
});
