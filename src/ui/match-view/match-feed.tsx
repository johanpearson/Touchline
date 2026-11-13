import type { CommentaryLine } from "../../commentary";
import type { MatchEvent } from "../../engine";
import { useI18n } from "../i18n-provider";
import { formatMatchMinute } from "./match-minute";

/** How many of the latest lines are shown. */
export const FEED_LENGTH = 6;

export type MatchFeedProps = {
  lines: readonly CommentaryLine[];
  events: readonly MatchEvent[];
  matchTime: number;
  homeColour: string;
  awayColour: string;
};

/** The latest commentary lines up to the current match time, newest first. */
export function MatchFeed({ lines, events, matchTime, homeColour, awayColour }: MatchFeedProps) {
  const { t } = useI18n();
  const shown = lines
    .filter((line) => line.time <= matchTime)
    .slice(-FEED_LENGTH)
    .reverse();
  const colourOf = (line: CommentaryLine) =>
    line.team === undefined ? "currentColor" : line.team === "home" ? homeColour : awayColour;
  return (
    <section className="panel" aria-labelledby="feed-title">
      <h2 id="feed-title">{t("feed.title")}</h2>
      <ul className="feed" data-testid="feed">
        {shown.map((line) => (
          <li
            key={`${line.time}-${line.kind}-${line.text}`}
            data-testid="feed-line"
            data-importance={line.importance}
            style={
              line.importance === "big" ? { borderLeft: `3px solid ${colourOf(line)}` } : undefined
            }
          >
            <span aria-hidden="true" className="dot" style={{ background: colourOf(line) }} />
            <span className="minute">{formatMatchMinute(line.time, events)}</span> {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
