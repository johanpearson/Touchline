import { buildRolloverRecord } from "./build-rollover-record";
import type { Career } from "./career";
import type { AttributeChange } from "./develop-player";
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

/** The career with every player aged and developed, and the change list of that development. */
const developed = (career: Career) => {
  const development = developPlayers(career);
  const next: Career = { ...career, league: { ...career.league, players: development.players } };
  return { next, changes: development.changes };
};

/** The change list without players who retired straight after. */
const survivorChanges = (changes: AttributeChange[], retired: Career): AttributeChange[] => {
  const staying = new Set(retired.league.players.map((p) => p.id));
  return changes.filter((change) => staying.has(change.playerId));
};

/**
 * Step one of the rollover (`docs/vision.md`, "Off-season order"): turns a completed season into
 * the off-season. In this order: the season summary joins the history (scorers are resolved
 * before anybody retires), the clubs' wages and prizes are settled (wages of the season just
 * played, so before contracts end), every player ages one year and develops, players retire,
 * AI clubs renew or release their expiring players, every club gets its youth intake, offers for
 * the user's players are made and the transfer window opens. The user's own expiring contracts
 * stay on the squad so they can be renewed during the window; `startNextSeason` lets the
 * unrenewed ones go. The change list of the development (players still in the league) and a
 * `RolloverRecord` of the user's club are stored in `lastDevelopment` and `lastRollover`, replaced every season. The season itself stays as it is (finished). Runs exactly once per season
 * (`already-finished` afterwards) and is pure and deterministic.
 */
export const finishSeason = (career: Career): FinishSeasonResult => {
  if (isSeasonFinished(career)) return { ok: false, error: "already-finished" };
  const summarised = summariseSeason(career);
  if (!summarised.ok) return summarised;
  const stored: Career = { ...career, history: [...career.history, summarised.summary] };
  const settled = settleSeasonFinances(stored);
  const { next, changes } = developed(settled);
  const aged = retirePlayers(next);
  const staffed = generateYouthIntake(renewAiContracts(aged));
  const recorded: Career = {
    ...staffed,
    window: "open",
    offers: [],
    lastDevelopment: survivorChanges(changes, aged),
    lastRollover: buildRolloverRecord(stored, settled, aged),
  };
  return { ok: true, career: generateOffers(recorded) };
};
