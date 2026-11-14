import type { SetPieceVariant } from "./action-event";
import { rating } from "./attribute-rating";
import type { EnginePlayer } from "./engine-player";
import type { Point } from "./pitch-metres";

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Slot with the best value, the lowest slot on ties. Slot 0 (the keeper) is only ever a candidate when `outfieldOnly` is false. */
const best = (
  players: readonly EnginePlayer[],
  value: (player: EnginePlayer, slot: number) => number,
): number =>
  players.reduce(
    (bestSlot, player, slot) =>
      slot !== 0 && value(player, slot) > value(players[bestSlot] as EnginePlayer, bestSlot)
        ? slot
        : bestSlot,
    1,
  );

/**
 * Who takes a restart: the keeper takes goal kicks, the nearest outfield player throw-ins, the best
 * finisher penalties and the best passer and reader of the game (passing plus vision) corners and free kicks and the best passer the kickoff. Deterministic, no randomness.
 */
export const restartTaker = (
  variant: SetPieceVariant,
  players: readonly EnginePlayer[],
  shape: readonly Point[],
  position: Point,
): number => {
  switch (variant) {
    case "goalKick":
      return 0;
    case "throwIn":
      return best(players, (_, slot) => -distance(shape[slot] as Point, position));
    case "penalty":
      return best(players, (p) => rating(p, "finishing"));
    case "corner":
    case "freeKick":
      return best(players, (p) => rating(p, "passing") + rating(p, "vision"));
    default:
      return best(players, (p) => rating(p, "passing"));
  }
};
