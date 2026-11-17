import type { Side, ZoneEvent } from "../../engine";
import { momentumSeries } from "../../engine";

/** How many seconds back "who is attacking" looks (the momentum chart's bucket, three minutes). */
const RECENT_SECONDS = 180;
/** Danger below this is too small to call either side the attacker. */
const MIN_EDGE = 0.15;

/** The side with the stronger recent pressure, or undefined while play is even. */
export const attackingSide = (
  events: readonly ZoneEvent[],
  matchTime: number,
): Side | undefined => {
  const recent = events.filter((e) => e.time > matchTime - RECENT_SECONDS);
  const series = momentumSeries(recent, matchTime, RECENT_SECONDS);
  const value = series.reduce((sum, n) => sum + n, 0);
  if (Math.abs(value) < MIN_EDGE) return undefined;
  return value > 0 ? "home" : "away";
};

type Translate = (
  key: "match.summary.score" | "match.summary.attack" | "match.summary.attack.even",
  params?: Record<string, string | number>,
) => string;

/** One sentence for assistive technology: the score and who is attacking. */
export const describeStage = (input: {
  t: Translate;
  names: Record<Side, string>;
  score: Record<Side, number>;
  attacking: Side | undefined;
}): string => {
  const { t, names, score, attacking } = input;
  const result = t("match.summary.score", {
    home: names.home,
    homeGoals: score.home,
    away: names.away,
    awayGoals: score.away,
  });
  const play = attacking
    ? t("match.summary.attack", { team: names[attacking] })
    : t("match.summary.attack.even");
  return `${result}. ${play}.`;
};
