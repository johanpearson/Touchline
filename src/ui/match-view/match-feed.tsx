import type { CommentaryLine } from "../../commentary";
import type { ZoneEvent } from "../../engine";
import { useI18n } from "../i18n-provider";
import { formatMatchMinute } from "./match-minute";

/** How many of the latest lines are shown. */
export const FEED_LENGTH = 6;

export type MatchFeedProps = {
  lines: readonly CommentaryLine[];
  events: readonly ZoneEvent[];
  matchTime: number;
  homeColour: string;
  awayColour: string;
};

/** Lines worth announcing: goals and chances, nothing else, so a screen reader is not flooded. */
const announced = (line: CommentaryLine): boolean =>
  line.kind === "goal" || line.kind === "chance" || line.kind === "penalty";

/**
 * The latest commentary lines up to the current match time, newest first. The list itself is not
 * a live region; a hidden polite one repeats only the newest goal or chance.
 */
export function MatchFeed({ lines, events, matchTime, homeColour, awayColour }: MatchFeedProps) {
  const { t } = useI18n();
  const upToNow = lines.filter((line) => line.time <= matchTime);
  const shown = upToNow.slice(-FEED_LENGTH).reverse();
  const latestBig = upToNow.filter(announced).at(-1);
  const colourOf = (line: CommentaryLine) =>
    line.team === undefined ? "currentColor" : line.team === "home" ? homeColour : awayColour;
  return (
    <section aria-labelledby="feed-title" data-testid="feed-panel">
      <h2 id="feed-title" className="m-0 mb-3 font-heading text-lg font-semibold">
        {t("feed.title")}
      </h2>
      <p className="sr-only" role="status" aria-live="polite" data-testid="feed-live">
        {latestBig?.text ?? ""}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="feed">
        {shown.map((line) => (
          <li
            key={`${line.time}-${line.kind}-${line.text}`}
            data-testid="feed-line"
            data-importance={line.importance}
            className="rounded-sm border-l-[3px] border-transparent pl-2 text-[15px] text-soft motion-safe:animate-[feed-in_0.3s_ease-out]"
            style={line.importance === "big" ? { borderLeftColor: colourOf(line) } : undefined}
          >
            <span
              aria-hidden="true"
              className="mr-1.5 inline-block size-2 rounded-full"
              style={{ background: colourOf(line) }}
            />
            <span className="text-muted tabular-nums">{formatMatchMinute(line.time, events)}</span>{" "}
            {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
