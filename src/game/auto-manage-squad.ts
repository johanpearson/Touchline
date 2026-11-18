import { marketValue, signingWage } from "./asking-price";
import type { Career } from "./career";
import { expireContracts } from "./expire-contracts";
import { playerOverall } from "./player-overall";
import { releasePlayer } from "./release-player";
import { askingWage, renewContract } from "./renew-contract";
import { repairedSquadPlan } from "./repair-squad-plan";
import { signFreeAgent } from "./sign-free-agent";
import { MAX_SQUAD_SIZE, MIN_PER_POSITION, squadLimits } from "./squad-limits";
import type { PlayerPosition } from "./squad-player";

const POSITIONS = Object.keys(MIN_PER_POSITION) as PlayerPosition[];

const userSquadIds = (career: Career): string[] =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [];

const renewExpiring = (career: Career): Career => {
  let current = career;
  for (const id of userSquadIds(career)) {
    if ((current.contracts[id]?.expiresSeason ?? Number.POSITIVE_INFINITY) > career.season.number) {
      continue;
    }
    const renewed = renewContract(current, id, askingWage(current, id) ?? 0, 3);
    if (renewed.ok) current = renewed.career;
  }
  return current;
};

const releaseSurplus = (career: Career): Career => {
  let current = career;
  while (squadLimits(current, current.userClubId).count > MAX_SQUAD_SIZE) {
    const squad = current.league.players.filter((p) => userSquadIds(current).includes(p.id));
    const count = (position: PlayerPosition) => squad.filter((p) => p.position === position).length;
    const worst = squad
      .filter((p) => count(p.position) > MIN_PER_POSITION[p.position])
      .sort((a, b) => (marketValue(current, a.id) ?? 0) - (marketValue(current, b.id) ?? 0))[0];
    if (!worst) return current;
    const released = releasePlayer(current, worst.id);
    if (!released.ok) return current;
    current = released.career;
  }
  return current;
};

/** The free agent to sign next: the best of a missing position (or of the thinnest line), cheapest wage as a fallback. */
const nextSigning = (career: Career) => {
  const limits = squadLimits(career, career.userClubId);
  const squad = career.league.players.filter((p) => userSquadIds(career).includes(p.id));
  const lacking = POSITIONS.filter((p) => (limits.missing[p] ?? 0) > 0);
  const pool = career.league.players.filter((p) => career.freeAgentIds.includes(p.id));
  const wanted = lacking.length > 0 ? lacking : POSITIONS;
  const thin = (p: PlayerPosition) => squad.filter((s) => s.position === p).length;
  const position = [...wanted].sort((a, b) => thin(a) - thin(b))[0] as PlayerPosition;
  return pool
    .filter((p) => p.position === position)
    .sort((a, b) => playerOverall(b) - playerOverall(a) || (a.id < b.id ? -1 : 1));
};

const fillSquad = (career: Career): Career => {
  let current = career;
  while (!squadLimits(current, current.userClubId).ok) {
    const candidates = nextSigning(current);
    const signed = candidates
      .map((p) => signFreeAgent(current, p.id, signingWage(current, p.id) ?? 0))
      .find((result) => result.ok);
    if (!signed?.ok) return current;
    current = signed.career;
  }
  return current;
};

/**
 * What a user who leaves the market alone gets in the off-season: renews every expiring contract
 * the wage budget allows at the player's asking wage for three seasons, lets the others end,
 * releases the weakest surplus above 30 (never below a position minimum) and signs the best free
 * agents of the needed positions until the squad is legal, then re-picks the lineup if a planned
 * player left. The UI no longer uses it (the off-season screen lets the user decide); it is the
 * passive user of the long-run balance test. Pure and deterministic; AI clubs are not touched.
 */
export const autoManageUserSquad = (career: Career): Career => {
  const legal = fillSquad(releaseSurplus(expireContracts(renewExpiring(career))));
  return { ...legal, squadPlan: repairedSquadPlan(legal) };
};
