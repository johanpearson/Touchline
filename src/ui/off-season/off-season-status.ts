import {
  askingWage,
  type Career,
  expireContracts,
  isSeasonComplete,
  isWindowOpen,
  MAX_SQUAD_SIZE,
  MIN_SQUAD_SIZE,
  type Player,
  playerOverall,
  type RenewError,
  squadLimits,
} from "../../game";
import type { MessageKey } from "../../i18n";

/** True while the off-season screen may be used: the season is over and the window is open. */
export const isOffSeason = (career: Career): boolean =>
  isSeasonComplete(career.season) && isWindowOpen(career);

export type StartBlock =
  | { kind: "over"; count: number; max: number }
  | { kind: "under"; count: number; min: number }
  | { kind: "positions"; missing: string };

/**
 * Why the next season cannot start yet, or null. It looks at the squad as it will be once the
 * unrenewed contracts have ended, which is what `startNextSeason` checks.
 */
export const startBlock = (career: Career): StartBlock | null => {
  const after = expireContracts(career);
  const limits = squadLimits(after, career.userClubId);
  if (limits.ok) return null;
  if (limits.excessTotal > 0) return { kind: "over", count: limits.count, max: MAX_SQUAD_SIZE };
  if (limits.missingTotal > 0) return { kind: "under", count: limits.count, min: MIN_SQUAD_SIZE };
  const missing = Object.entries(limits.missing)
    .map(([position, count]) => `${position} ${count}`)
    .join(", ");
  return { kind: "positions", missing };
};

/** A user's player whose contract ends with the finished season, with what he asks to stay. */
export type ExpiringRow = { player: Player; overall: number; ask: number; ends: number };

/** The user's players whose contract has ended, best first, ties by name. */
export const expiringPlayers = (career: Career): ExpiringRow[] => {
  const ids = career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [];
  const rows = career.league.players
    .filter((p) => ids.includes(p.id))
    .flatMap((player) => {
      const ends = career.contracts[player.id]?.expiresSeason;
      const ask = askingWage(career, player.id);
      if (ends === undefined || ends > career.season.number || ask === undefined) return [];
      return [{ player, overall: playerOverall(player), ask, ends }];
    });
  return rows.sort((a, b) => b.overall - a.overall || (a.player.name < b.player.name ? -1 : 1));
};

/** The message of a refused renewal. */
export const renewErrorKey = (error: RenewError): MessageKey =>
  error === "not-expiring" ? "offSeason.error.not-expiring" : `market.error.${error}`;
