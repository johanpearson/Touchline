import type { Player, PlayerPosition, SquadPlan } from "../../game";
import { LINE_ORDER } from "./pitch-layout";

/** Changes to the starters and/or the bench; an absent list stays as it is. */
export type LineupEdit = { starters?: string[]; bench?: string[] };

/** A player offered in a picker; a disabled one is shown but cannot be chosen. */
export type Candidate = { player: Player; disabled: boolean };

/** Starters ordered GK, DEF, MID, FWD (stable within a line). */
export const orderedStarters = (
  ids: readonly string[],
  byId: ReadonlyMap<string, Player>,
): string[] => LINE_ORDER.flatMap((line) => ids.filter((id) => byId.get(id)?.position === line));

const replaceId = (list: readonly string[], from: string, to: string): string[] =>
  list.map((id) => (id === from ? to : id));

/** Puts `to` in `from`'s place and, if `to` was in the list, `from` in `to`'s place. */
const swapIds = (list: readonly string[], from: string, to: string): string[] =>
  list.map((id) => (id === from ? to : id === to ? from : id));

/** Choosing a bench player as starter sends the starter to that bench slot (one-step swap). */
export const starterEdit = (plan: SquadPlan, from: string, to: string): LineupEdit =>
  plan.bench.includes(to)
    ? { starters: replaceId(plan.starters, from, to), bench: replaceId(plan.bench, to, from) }
    : { starters: replaceId(plan.starters, from, to) };

/** Choosing another bench player swaps the two; a player outside the plan takes the slot. */
export const benchEdit = (plan: SquadPlan, from: string, to: string): LineupEdit => ({
  bench: swapIds(plan.bench, from, to),
});

/** Players of the slot's position; other starters are taken, bench and spare players may step in. */
export const starterCandidates = (
  players: readonly Player[],
  plan: SquadPlan,
  slotPlayerId: string,
  position: PlayerPosition,
): Candidate[] => {
  const starters = new Set(plan.starters);
  return players
    .filter((p) => p.position === position)
    .map((player) => ({
      player,
      disabled: player.id !== slotPlayerId && starters.has(player.id),
    }));
};

/** Any player for a bench slot, except starters and, for the bench's only keeper, outfield players. */
export const benchCandidates = (
  players: readonly Player[],
  plan: SquadPlan,
  slotPlayerId: string,
  byId: ReadonlyMap<string, Player>,
): Candidate[] => {
  const starters = new Set(plan.starters);
  const isKeeper = (id: string) => byId.get(id)?.position === "GK";
  const keeperLocked = isKeeper(slotPlayerId) && plan.bench.filter(isKeeper).length === 1;
  return players.map((player) => ({
    player,
    disabled:
      player.id !== slotPlayerId &&
      (starters.has(player.id) || (keeperLocked && player.position !== "GK")),
  }));
};
