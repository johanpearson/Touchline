import { autoManageUserSquad } from "./auto-manage-squad";
import type { Career } from "./career";
import { finishSeason, isSeasonFinished } from "./finish-season";
import { type NextSeasonResult, startNextSeason } from "./start-next-season";

/**
 * The whole rollover in one call, for a caller without an off-season screen: finishes the season
 * (unless `finishSeason` already ran), puts the user's squad on autopilot (`autoManageUserSquad`)
 * and starts the next season. Errors are those of `startNextSeason`; a season that is not complete
 * gives `season-incomplete`. The UI no longer uses it (the off-season screen lets the user decide); it is the passive user of the long-run balance test.
 */
export const rollOverSeason = (career: Career): NextSeasonResult => {
  const opened = isSeasonFinished(career) ? { ok: true as const, career } : finishSeason(career);
  if (!opened.ok) return { ok: false, error: "season-incomplete" };
  return startNextSeason(autoManageUserSquad(opened.career));
};
