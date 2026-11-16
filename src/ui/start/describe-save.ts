import type { Locale, Translator } from "../../i18n";
import { formatOrdinal } from "./ordinal";
import { relativeTime } from "./relative-time";

type Translate = Translator["t"];

/** What a save line says about a career. `position` is null when the table cannot be built. */
export type SaveFacts = {
  season: number;
  matchday: number;
  position: number | null;
  savedAt: string;
};

/** "2 hours ago" in the locale, or "just now" within the first minute. */
export function savedAgo(t: Translate, locale: Locale, savedAt: string, nowIso: string): string {
  const when = relativeTime(savedAt, nowIso, locale);
  return when.kind === "just-now" ? t("start.justNow") : when.text;
}

/** "Season 1, round 12, 3rd, saved 2 hours ago": the line under the club on the Continue card. */
export function describeContinue(
  t: Translate,
  locale: Locale,
  facts: SaveFacts,
  nowIso: string,
): string {
  const params = {
    season: facts.season,
    round: facts.matchday,
    saved: savedAgo(t, locale, facts.savedAt, nowIso),
  };
  return facts.position === null
    ? t("start.continue.detailsNoPosition", params)
    : t("start.continue.details", { ...params, position: formatOrdinal(facts.position, locale) });
}

/** "Season 1, round 12, saved 2 hours ago": the line of a row in the saved careers list. */
export function describeSavedRow(
  t: Translate,
  locale: Locale,
  facts: Omit<SaveFacts, "position">,
  nowIso: string,
): string {
  return t("start.load.details", {
    season: facts.season,
    round: facts.matchday,
    saved: savedAgo(t, locale, facts.savedAt, nowIso),
  });
}
