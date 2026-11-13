import type { MatchState, MatchStats } from "../../engine";
import { useI18n } from "../i18n-provider";
import { StatsPanel } from "./stats-panel";

export type HalfTimePanelProps = {
  homeName: string;
  awayName: string;
  score: MatchState["score"];
  /** Statistics for the first half. */
  stats: MatchStats;
  onResume: () => void;
};

/** Shown while the match is held at half-time; the user starts the second half. */
export function HalfTimePanel({ homeName, awayName, score, stats, onResume }: HalfTimePanelProps) {
  const { t } = useI18n();
  return (
    <div
      className="half-time"
      role="dialog"
      aria-labelledby="half-time-title"
      data-testid="half-time"
    >
      <h2 id="half-time-title">{t("halfTime.title")}</h2>
      <p className="half-time-score" data-testid="half-time-score">
        {homeName} {score.home} – {score.away} {awayName}
      </p>
      <StatsPanel stats={stats} />
      <section className="panel" data-testid="half-time-changes">
        <h3>{t("halfTime.changes")}</h3>
        <p>{t("halfTime.changesPlaceholder")}</p>
      </section>
      <button type="button" data-testid="start-second-half" onClick={onResume}>
        {t("halfTime.start")}
      </button>
    </div>
  );
}
