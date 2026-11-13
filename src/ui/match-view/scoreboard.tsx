import type { MatchEvent, MatchState } from "../../engine";
import { useI18n } from "../i18n-provider";
import { formatMatchMinute } from "./match-minute";

export type ScoreboardProps = {
  homeName: string;
  awayName: string;
  homeColour: string;
  awayColour: string;
  score: MatchState["score"];
  period: MatchState["period"];
  matchTime: number;
  events: readonly MatchEvent[];
};

/** Team names in their colours, the score, the match clock and the period. */
export function Scoreboard({
  homeName,
  awayName,
  homeColour,
  awayColour,
  score,
  period,
  matchTime,
  events,
}: ScoreboardProps) {
  const { t } = useI18n();
  return (
    <section className="scoreboard" aria-label={t("scoreboard.label")} data-testid="scoreboard">
      <span className="team" data-testid="home-name" style={{ borderColor: homeColour }}>
        {homeName}
      </span>
      <span className="score" data-testid="score">
        {score.home} – {score.away}
      </span>
      <span className="team" data-testid="away-name" style={{ borderColor: awayColour }}>
        {awayName}
      </span>
      <span className="clock" data-testid="clock">
        {formatMatchMinute(matchTime, events)}
      </span>
      <span className="period" data-testid="period">
        {t(`period.${period}`)}
      </span>
    </section>
  );
}
