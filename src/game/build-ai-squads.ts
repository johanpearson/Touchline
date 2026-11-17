import { aiClubsById } from "./ai-clubs";
import { marketValue, signingWage } from "./asking-price";
import type { Career } from "./career";
import type { Club } from "./club";
import { SQUAD_SHAPE } from "./generate-squad";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";
import { MAX_SQUAD_SIZE, MIN_PER_POSITION, MIN_SQUAD_SIZE, squadLimits } from "./squad-limits";
import type { PlayerPosition } from "./squad-player";
import { DEFAULT_CONTRACT_SEASONS, reassign, withContract } from "./transfer-core";
import { wageBill, wageBudget } from "./wage-budget";

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

const byId = (a: Player, b: Player): number => (a.id < b.id ? -1 : 1);

const playersOf = (career: Career, ids: readonly string[]): Player[] => {
  const wanted = new Set(ids);
  return career.league.players.filter((p) => wanted.has(p.id));
};

const squadOf = (career: Career, club: Club): Player[] => playersOf(career, club.playerIds);

/** Releases the club's lowest-value players above 30, never below a position minimum. */
const releaseSurplus = (career: Career, clubId: string): Career => {
  let current = career;
  for (;;) {
    const club = current.league.clubs.find((c) => c.id === clubId) as Club;
    const squad = squadOf(current, club);
    if (squad.length <= MAX_SQUAD_SIZE) return current;
    const counts = (p: PlayerPosition) => squad.filter((s) => s.position === p).length;
    const releasable = squad
      .filter((p) => counts(p.position) > MIN_PER_POSITION[p.position])
      .sort((a, b) => worthOf(current, a) - worthOf(current, b) || byId(a, b));
    const next = releasable[0];
    if (!next) return current;
    current = reassign(current, next.id);
  }
};

const worthOf = (career: Career, player: Player): number => marketValue(career, player.id) ?? 0;

/** The position the club should fill next: a missing minimum first, then its thinnest line. */
const neededPosition = (
  career: Career,
  club: Club,
  pool: readonly Player[],
): PlayerPosition | undefined => {
  const squad = squadOf(career, club);
  const count = (p: PlayerPosition) => squad.filter((s) => s.position === p).length;
  const available = POSITIONS.filter((p) => pool.some((f) => f.position === p));
  const gaps = (p: PlayerPosition) => MIN_PER_POSITION[p] - count(p);
  const lacking = available.filter((p) => gaps(p) > 0);
  const options = lacking.length > 0 ? lacking : available;
  const gap = (p: PlayerPosition) => (lacking.length > 0 ? gaps(p) : SQUAD_SHAPE[p] - count(p));
  const best = Math.max(...options.map(gap));
  return options.find((p) => gap(p) === best);
};

const isLegal = (career: Career, clubId: string): boolean => {
  const limits = squadLimits(career, clubId);
  return limits.missingTotal === 0 && Object.keys(limits.missing).length === 0;
};

/** The best free agent of the position the club can afford; failing that the cheapest one. */
const chooseSigning = (career: Career, clubId: string, position: PlayerPosition): Player => {
  const finance = career.finances[clubId];
  const room = (finance ? wageBudget(finance) : 0) - wageBill(career, clubId);
  const wageOf = (p: Player) => signingWage(career, p.id) ?? 0;
  const pool = playersOf(career, career.freeAgentIds).filter((p) => p.position === position);
  const affordable = pool
    .filter((p) => wageOf(p) <= room)
    .sort((a, b) => playerOverall(b) - playerOverall(a) || byId(a, b));
  const cheapest = [...pool].sort((a, b) => wageOf(a) - wageOf(b) || byId(a, b));
  return (affordable[0] ?? cheapest[0]) as Player;
};

const fillSquad = (career: Career, clubId: string): Career => {
  let current = career;
  for (;;) {
    const club = current.league.clubs.find((c) => c.id === clubId) as Club;
    const needsMore = squadOf(current, club).length < MIN_SQUAD_SIZE || !isLegal(current, clubId);
    if (!needsMore) return current;
    const pool = playersOf(current, current.freeAgentIds);
    const position = neededPosition(current, club, pool);
    if (!position) return current;
    const player = chooseSigning(current, clubId, position);
    const wage = signingWage(current, player.id) ?? 0;
    const moved = reassign(current, player.id, clubId);
    current = withContract(moved, player.id, wage, DEFAULT_CONTRACT_SEASONS);
  }
};

/**
 * Lets the AI clubs prepare for the next season, once the free-agent pool is known. First every
 * club above 30 players releases its lowest-value players (never below a position minimum). Then,
 * club by club in id order, each club that lacks players signs the best free agent it can afford
 * for its need (a missing position minimum first, then its thinnest line) until it has 18 players
 * and every minimum. A signing costs no fee and gets a three-season contract at the asking wage;
 * a club that cannot pay signs the cheapest free agent instead, so it still ends legal. Only free
 * agents and releases: no AI-to-AI trades. The user's club is not touched. Pure and deterministic.
 */
export const buildAiSquads = (career: Career): Career => {
  const ids = aiClubsById(career).map((club) => club.id);
  const trimmed = ids.reduce(releaseSurplus, career);
  return ids.reduce(fillSquad, trimmed);
};
