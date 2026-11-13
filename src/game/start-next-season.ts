import type { Career } from "./career";
import { createSeason } from "./create-season";
import { summariseSeason } from "./summarise-season";

export type NextSeasonResult =
  | { ok: true; career: Career }
  | { ok: false; error: "season-incomplete" };

/**
 * Rolls a finished career over to the next season: appends the finished season's summary to the
 * history and schedules a fresh fixture list. Clubs and players are unchanged until growth (M6).
 */
export const startNextSeason = (career: Career): NextSeasonResult => {
  const summarised = summariseSeason(career);
  if (!summarised.ok) return summarised;
  const season = createSeason(
    career.seed,
    career.season.number + 1,
    career.league.clubs.map((club) => club.id),
  );
  return {
    ok: true,
    career: { ...career, season, history: [...career.history, summarised.summary] },
  };
};
