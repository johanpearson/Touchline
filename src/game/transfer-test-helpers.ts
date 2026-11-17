import type { Career } from "./career";
import { aCareer, deepFreeze } from "./career-builders";
import { pickBestEleven } from "./pick-best-eleven";
import { clubSquad } from "./squad-plan";
import { reassign } from "./transfer-core";

export const RICH = 1_000_000_000;

/** A career in the off-season window where every club has a huge balance and wage budget. Frozen. */
export const inWindow = (seed = 1): Career => {
  const base = aCareer(seed);
  const finances = Object.fromEntries(
    base.league.clubs.map((c) => [c.id, { balance: RICH, baseIncome: RICH }]),
  );
  return deepFreeze({ ...base, window: "open" as const, finances });
};

export const userClubOf = (career: Career) => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) throw new Error("no user club");
  return club;
};

export const aiClubOf = (career: Career) => {
  const club = career.league.clubs.find((c) => c.id !== career.userClubId);
  if (!club) throw new Error("no AI club");
  return club;
};

/** A player of the AI club who is not in its best eleven, and one who is. */
export const benchPlayerOf = (career: Career, clubId: string): string => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  const squad = clubSquad(club as { playerIds: string[] }, career.league.players);
  const eleven = new Set(pickBestEleven(squad).map((p) => p.id));
  return (squad.find((p) => !eleven.has(p.id)) as { id: string }).id;
};

export const starPlayerOf = (career: Career, clubId: string): string => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  const squad = clubSquad(club as { playerIds: string[] }, career.league.players);
  return (pickBestEleven(squad)[0] as { id: string }).id;
};

/** Moves a player to the free agents. */
export const toFreeAgents = (career: Career, playerId: string): Career =>
  reassign(career, playerId);

export const sumOfBalances = (career: Career): number =>
  Object.values(career.finances).reduce((sum, f) => sum + f.balance, 0);
