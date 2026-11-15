import type { ActionEvent, PassEvent, PositionSnapshot, Side } from "../../engine";

type Point = { x: number; y: number };

/** One completed pass of the chain, in metres. */
export type ChainSegment = { from: Point; to: Point; actor: string; target: string };

/** One line of the chain between two players' current positions; `strength` fades with age, 0..1. */
export type ChainLink = { from: Point; to: Point; strength: number };

const HOME_SLOTS = 11;
const MIN_STRENGTH = 0.25;

const isCompletePass = (event: ActionEvent): event is PassEvent =>
  event.type === "pass" && event.outcome === "complete";

/** The trailing run of completed passes by one team up to `time`, oldest first. */
const trailingPasses = (
  events: readonly ActionEvent[],
  time: number,
  windowSeconds: number,
): PassEvent[] => {
  const chain: PassEvent[] = [];
  let team: Side | undefined;
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i] as ActionEvent;
    if (event.time > time) continue;
    if (event.time < time - windowSeconds) break;
    if (event.type === "carry" && event.outcome === "kept" && (team ?? event.team) === event.team) {
      continue;
    }
    if (!isCompletePass(event) || (team !== undefined && event.team !== team)) break;
    team = event.team;
    chain.unshift(event);
  }
  return chain;
};

/**
 * The recent consecutive completed passes of the team in possession, as ordered segments. A
 * turnover, a restart, a period change or any other action (a shot, a foul) breaks the chain;
 * carries by the same team do not. Only passes within `windowSeconds` before `time` count.
 */
export const passingChain = (
  events: readonly ActionEvent[],
  time: number,
  windowSeconds: number,
): ChainSegment[] =>
  trailingPasses(events, time, windowSeconds).map(({ from, to, actor, target }) => ({
    from,
    to,
    actor,
    target,
  }));

const nearestSlot = (
  players: readonly Point[],
  side: Side,
  point: Point,
  exclude?: number,
): number => {
  const offset = side === "home" ? 0 : HOME_SLOTS;
  let best = offset;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let slot = offset; slot < offset + HOME_SLOTS; slot++) {
    const player = players[slot];
    if (!player || slot === exclude) continue;
    const distance = Math.hypot(player.x - point.x, player.y - point.y);
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  return best;
};

/**
 * The chain as lines between the passers' and receivers' positions in `current` (usually the
 * interpolated snapshot). The players of a pass are found as the teammates nearest the pass's
 * start and end in the snapshot taken at that pass. `undefined` when there is no chain.
 */
export const chainLines = (
  events: readonly ActionEvent[],
  time: number,
  windowSeconds: number,
  current: PositionSnapshot,
): { team: Side; links: ChainLink[] } | undefined => {
  const passes = trailingPasses(events, time, windowSeconds);
  const first = passes[0];
  if (!first) return undefined;
  const links: ChainLink[] = [];
  passes.forEach((pass, index) => {
    const players = pass.snapshot?.players ?? current.players;
    const actorSlot = nearestSlot(players, pass.team, pass.from);
    const targetSlot = nearestSlot(players, pass.team, pass.to, actorSlot);
    const from = current.players[actorSlot];
    const to = current.players[targetSlot];
    if (!from || !to) return;
    const age = (passes.length - 1 - index) / Math.max(1, passes.length);
    links.push({ from, to, strength: Math.max(MIN_STRENGTH, 1 - age) });
  });
  return { team: first.team, links };
};
