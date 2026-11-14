import type { ActionEvent, SetPieceEvent, Side } from "../../engine";

/** A set piece that is being set up: who takes it, and what kind it is. */
export type ActiveSetPiece = {
  variant: SetPieceEvent["variant"];
  team: Side;
  /** Snapshot slot of the taker: home 0 to 10, away 11 to 21. */
  taker: number;
};

const HOME_SLOTS = 11;

/**
 * The set piece being taken at `time`: from the set-piece event until the next event, the first
 * action of the restart. The taker is the player of the taking side standing nearest the ball
 * in the set-up snapshot. `undefined` when none is in progress or the log has no snapshots.
 */
export const activeSetPiece = (
  events: readonly ActionEvent[],
  time: number,
): ActiveSetPiece | undefined => {
  let index = -1;
  for (let i = 0; i < events.length && (events[i] as ActionEvent).time <= time; i++) index = i;
  const event = events[index];
  if (event?.type !== "setPiece" || !event.snapshot) return undefined;
  const offset = event.team === "home" ? 0 : HOME_SLOTS;
  const { players } = event.snapshot;
  let taker = offset;
  let best = Number.POSITIVE_INFINITY;
  for (let slot = offset; slot < offset + HOME_SLOTS; slot++) {
    const player = players[slot];
    if (!player) continue;
    const distance = Math.hypot(player.x - event.from.x, player.y - event.from.y);
    if (distance < best) {
      taker = slot;
      best = distance;
    }
  }
  return { variant: event.variant, team: event.team, taker };
};
