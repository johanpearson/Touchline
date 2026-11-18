import type { Career } from "./career";
import { playerValue } from "./player-value";

/**
 * The most free agents the pool keeps after `startNextSeason`. The pool otherwise only shrinks by
 * signings and retirement, so unwanted players pile up season after season.
 */
export const FREE_AGENT_POOL_CAP = 40;

const without = <T>(record: Readonly<Record<string, T>>, ids: ReadonlySet<string>) =>
  Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)));

/**
 * Keeps the free-agent pool within `cap` by removing the least wanted players: the lowest `value`
 * first, ties by id (the lower id goes first). Removed players disappear from `freeAgentIds`,
 * `league.players`, contracts, condition and minutes, like retirees. Needs no randomness, and the
 * result does not depend on the order of the pool or of the clubs. Returns the same career when the
 * pool is within the cap.
 */
export const trimFreeAgents = (career: Career, cap: number = FREE_AGENT_POOL_CAP): Career => {
  if (career.freeAgentIds.length <= cap) return career;
  const byId = new Map(career.league.players.map((p) => [p.id, p]));
  const season = career.season.number;
  const valueOfPlayer = (id: string): number => {
    const player = byId.get(id);
    if (!player) return 0;
    return playerValue(player, career.contracts[id] ?? { expiresSeason: season }, season);
  };
  const ranked = [...career.freeAgentIds]
    .map((id) => ({ id, value: valueOfPlayer(id) }))
    .sort((a, b) => a.value - b.value || (a.id < b.id ? -1 : 1));
  const removed = new Set(ranked.slice(0, career.freeAgentIds.length - cap).map((r) => r.id));
  return {
    ...career,
    league: { ...career.league, players: career.league.players.filter((p) => !removed.has(p.id)) },
    freeAgentIds: career.freeAgentIds.filter((id) => !removed.has(id)),
    contracts: without(career.contracts, removed),
    condition: without(career.condition, removed),
    minutes: without(career.minutes, removed),
  };
};
