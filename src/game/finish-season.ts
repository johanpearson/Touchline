import type { Career } from "./career";
import { developPlayers } from "./develop-players";
import { generateOffers } from "./generate-offers";
import { renewAiContracts } from "./renew-ai-contracts";
import { retirePlayers } from "./retire-players";
import { settleSeasonFinances } from "./settle-season-finances";
import { summariseSeason } from "./summarise-season";
import { generateYouthIntake } from "./youth-intake";

export type FinishSeasonError = "season-incomplete" | "already-finished";

export type FinishSeasonResult =
  | { ok: true; career: Career }
  | { ok: false; error: FinishSeasonError };

/** True once `finishSeason` has run for the current season (its summary is in the history). */
export const isSeasonFinished = (career: Career): boolean =>
  career.history.some((summary) => summary.seasonNumber === career.season.number);

const developed = (career: Career): Career => ({
  ...career,
  league: { ...career.league, players: developPlayers(career).players },
});

/**
 * Step one of the rollover (`docs/vision.md`, "Off-season order"): turns a completed season into
 * the off-season. In this order: the season summary joins the history (scorers are resolved
 * before anybody retires), the clubs' wages and prizes are settled (wages of the season just
 * played, so before contracts end), every player ages one year and develops, players retire,
 * AI clubs renew or release their expiring players, every club gets its youth intake, offers for
 * the user's players are made and the transfer window opens. The user's own expiring contracts
 * stay on the squad so they can be renewed during the window; `startNextSeason` lets the
 * unrenewed ones go. The season itself stays as it is (finished). Runs exactly once per season
 * (`already-finished` afterwards) and is pure and deterministic.
 */
export const finishSeason = (career: Career): FinishSeasonResult => {
  if (isSeasonFinished(career)) return { ok: false, error: "already-finished" };
  const summarised = summariseSeason(career);
  if (!summarised.ok) return summarised;
  const stored: Career = { ...career, history: [...career.history, summarised.summary] };
  const aged = retirePlayers(developed(settleSeasonFinances(stored)));
  const staffed = generateYouthIntake(renewAiContracts(aged));
  return { ok: true, career: generateOffers({ ...staffed, window: "open", offers: [] }) };
};
