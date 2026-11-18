import { buildAiSquads } from "./build-ai-squads";
import type { Career } from "./career";
import { createSeason } from "./create-season";
import { expireContracts } from "./expire-contracts";
import { isSeasonComplete } from "./is-season-complete";
import { repairedSquadPlan } from "./repair-squad-plan";
import { squadLimits } from "./squad-limits";
import { initialConditions } from "./squad-plan";
import { trimFreeAgents } from "./trim-free-agents";

export type NextSeasonError = "season-incomplete" | "window-not-open" | "squad-over-limit";

export type NextSeasonResult = { ok: true; career: Career } | { ok: false; error: NextSeasonError };

/** Resets every player's season minutes to zero. */
const zeroMinutes = (career: Career): Career["minutes"] =>
  Object.fromEntries(career.league.players.map((p) => [p.id, 0]));

/**
 * Step two of the rollover: starts the next season once `finishSeason` has opened the window.
 * Refused with `season-incomplete` while the season runs, `window-not-open` when the off-season
 * has not begun (call `finishSeason` first) and `squad-over-limit` when the user's squad, after
 * his unrenewed contracts end, is outside 18 to 30 players or misses a position minimum. Then the
 * user's unrenewed players leave for the free agents, the AI clubs release surplus players and sign
 * free agents to fill their holes, the free-agent pool is cut to `FREE_AGENT_POOL_CAP` (lowest value first), offers are cleared, the window closes, fitness and form reset and
 * the new season (fixtures, no results) starts. The squad plan keeps its formation and tactics and is re-picked if a starter or substitute left. Pure and deterministic.
 */
export const startNextSeason = (career: Career): NextSeasonResult => {
  if (!isSeasonComplete(career.season)) return { ok: false, error: "season-incomplete" };
  if (career.window !== "open") return { ok: false, error: "window-not-open" };
  const expired = expireContracts(career);
  if (!squadLimits(expired, expired.userClubId).ok) return { ok: false, error: "squad-over-limit" };
  const staffed = trimFreeAgents(
    buildAiSquads({ ...expired, squadPlan: repairedSquadPlan(expired) }),
  );
  const season = createSeason(
    career.seed,
    career.season.number + 1,
    staffed.league.clubs.map((club) => club.id),
  );
  return {
    ok: true,
    career: {
      ...staffed,
      season,
      window: "closed",
      offers: [],
      condition: initialConditions(staffed.league.players),
      minutes: zeroMinutes(staffed),
    },
  };
};
