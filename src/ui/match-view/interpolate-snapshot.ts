import type { ActionEvent, PositionSnapshot } from "../../engine";

const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;

type Point = { x: number; y: number };
type Snapshotted = { time: number; period: ActionEvent["period"]; snapshot: PositionSnapshot };

const clamp = (value: number, max: number): number => Math.min(max, Math.max(0, value));
const lerp = (from: number, to: number, f: number): number => from + (to - from) * f;

const onPitch = (point: Point): Point => ({
  x: clamp(point.x, PITCH_LENGTH),
  y: clamp(point.y, PITCH_WIDTH),
});

const blend = (from: Point, to: Point, f: number): Point =>
  onPitch({ x: lerp(from.x, to.x, f), y: lerp(from.y, to.y, f) });

/** A restart (half-time, kickoff after a goal) puts everyone back in place at once. */
const isJump = (earlier: Snapshotted, later: ActionEvent): boolean =>
  later.type === "periodChange" || later.type === "setPiece" || later.period !== earlier.period;

/**
 * The 22 players and the ball at match time `time`, from the position snapshots of the log.
 * Between two snapshots positions are interpolated linearly; before the first and after the last
 * the nearest snapshot is held. Across a restart the earlier snapshot is held until the later one
 * is reached, so the view snaps instead of sliding the teams across the pitch. At an event time
 * the event's own snapshot is returned. `undefined` when the log has no snapshots (fast detail).
 */
export const interpolateSnapshot = (
  events: readonly ActionEvent[],
  time: number,
): PositionSnapshot | undefined => {
  const withSnapshots = events.filter((event) => event.snapshot !== undefined);
  // The last event at or before `time`, and the first one after it.
  let afterIndex = withSnapshots.findIndex((event) => event.time > time);
  if (afterIndex === -1) afterIndex = withSnapshots.length;
  const before = withSnapshots[afterIndex - 1];
  const after = withSnapshots[afterIndex];
  if (!before?.snapshot) return after?.snapshot;
  if (!after?.snapshot) return before.snapshot;
  if (isJump({ ...before, snapshot: before.snapshot }, after) || before.time === time) {
    return before.snapshot;
  }
  const f = (time - before.time) / (after.time - before.time);
  return {
    ball: blend(before.snapshot.ball, after.snapshot.ball, f),
    players: before.snapshot.players.map((p, i) => blend(p, after.snapshot?.players[i] ?? p, f)),
  };
};
