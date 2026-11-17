import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import type { Contract } from "./contract";
import { aiClubOf } from "./transfer-test-helpers";

/** Gives the listed players a contract that ends with the current season. */
export const expiring = (career: Career, ids: readonly string[]): Career => {
  const contracts: Record<string, Contract> = { ...career.contracts };
  for (const id of ids) {
    contracts[id] = { wage: contracts[id]?.wage ?? 0, expiresSeason: career.season.number };
  }
  return { ...career, contracts };
};

/** A frozen career where every player of every AI club has a contract ending this season. */
export const allAiExpiring = (seed = 1): Career => {
  const base = aCareer(seed);
  const ids = base.league.clubs.filter((c) => c.id !== base.userClubId).flatMap((c) => c.playerIds);
  return deepFreeze(expiring(base, ids));
};

export const firstAiClub = (career: Career) => aiClubOf(career);
