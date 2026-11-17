import { createRng } from "../engine";
import { aiClubsById } from "./ai-clubs";
import type { Career } from "./career";
import type { Club } from "./club";
import type { Contract } from "./contract";
import { MAX_CONTRACT_SEASONS, MIN_CONTRACT_SEASONS } from "./initial-economy";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";
import { askingWage } from "./renew-contract";
import { clubSquad } from "./squad-plan";
import { wageBill, wageBudget } from "./wage-budget";

/** An AI club renews expiring players who are among its best this many, or who are young. */
export const AI_RENEW_BEST_COUNT = 18;
/** ... or aged at most this. */
export const AI_RENEW_MAX_AGE = 23;

const byOverallThenId = (a: Player, b: Player): number =>
  playerOverall(b) - playerOverall(a) || (a.id < b.id ? -1 : 1);

const isExpiring = (career: Career, id: string): boolean =>
  (career.contracts[id]?.expiresSeason ?? Number.POSITIVE_INFINITY) <= career.season.number;

type Renewals = { renewed: Record<string, Contract>; released: string[] };

const decideRenewals = (career: Career, club: Club): Renewals => {
  const finance = career.finances[club.id];
  const squad = clubSquad(club, career.league.players).sort(byOverallThenId);
  const best = new Set(squad.slice(0, AI_RENEW_BEST_COUNT).map((p) => p.id));
  const expiring = squad.filter((p) => isExpiring(career, p.id));
  let bill = wageBill(career, club.id);
  for (const p of expiring) bill -= career.contracts[p.id]?.wage ?? 0;
  const renewed: Record<string, Contract> = {};
  const rng = createRng(career.seed).fork(`ai-renew-${career.season.number}`);
  for (const player of expiring) {
    const wage = askingWage(career, player.id) ?? 0;
    const wanted = best.has(player.id) || player.age <= AI_RENEW_MAX_AGE;
    if (!wanted || !finance || bill + wage > wageBudget(finance)) continue;
    const seasons = rng.fork(player.id).int(MIN_CONTRACT_SEASONS, MAX_CONTRACT_SEASONS);
    renewed[player.id] = { wage, expiresSeason: career.season.number + seasons };
    bill += wage;
  }
  const released = expiring.map((p) => p.id).filter((id) => !(id in renewed));
  return { renewed, released };
};

/**
 * Decides which expiring players the AI clubs keep. A player whose contract ends with the current
 * season is renewed (1 to 5 seasons, his asking wage) if he is among his club's best 18 or aged 23
 * or under, and the club's wage bill stays within its wage budget (best players first). The other
 * expiring players of AI clubs are released into `freeAgentIds` right away. The user's club is not
 * touched. Pure and deterministic: each club decides alone, from `createRng(seed)`. Run it before
 * `expireContracts`.
 */
export const renewAiContracts = (career: Career): Career => {
  const decisions = aiClubsById(career).map((club) => decideRenewals(career, club));
  const released = new Set(decisions.flatMap((d) => d.released));
  const contracts = Object.assign({}, career.contracts, ...decisions.map((d) => d.renewed));
  const clubs = career.league.clubs.map((club) => ({
    ...club,
    playerIds: club.playerIds.filter((id) => !released.has(id)),
  }));
  return {
    ...career,
    contracts,
    league: { ...career.league, clubs },
    freeAgentIds: [...career.freeAgentIds, ...[...released].sort()],
  };
};
