import type { ZoneEvent } from "../../engine";
import { momentumSeries } from "../../engine";
import { useI18n } from "../i18n-provider";
import { momentumBars } from "./momentum-bars";
import { attackingSide } from "./stage-summary";

/** The match is shown in buckets of this many seconds (three minutes). */
export const BUCKET_SECONDS = 180;
const WIDTH = 300;
const HEIGHT = 80;
/** Danger sum of a bucket that fills the chart in a normal match. */
const MIN_SCALE = 1.5;

export type MomentumChartProps = {
  events: readonly ZoneEvent[];
  matchTime: number;
  homeColour: string;
  awayColour: string;
  /** Names the sides in the text summary; without them the summary is left out. */
  names?: { home: string; away: string };
};

/**
 * Signed pressure over time: the home team's above the line, the away team's below it. A
 * non-interactive graphic: labelled, with a text summary of who is on top right now.
 */
export function MomentumChart({
  events,
  matchTime,
  homeColour,
  awayColour,
  names,
}: MomentumChartProps) {
  const { t } = useI18n();
  const bars = momentumBars(momentumSeries(events, matchTime, BUCKET_SECONDS), {
    width: WIDTH,
    height: HEIGHT,
    minScale: MIN_SCALE,
  });
  const attacking = attackingSide(events, matchTime);
  const summary = names
    ? attacking
      ? t("match.summary.attack", { team: names[attacking] })
      : t("match.summary.attack.even")
    : undefined;
  return (
    <section aria-labelledby="chart-title" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="chart-title" className="m-0 mb-2 font-heading text-lg font-semibold">
        {t("chart.title")}
      </h2>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={summary ? `${t("chart.label")}. ${summary}.` : t("chart.label")}
        data-testid="momentum-chart"
        className="block h-auto w-full"
      >
        {bars.map((bar) => (
          <rect
            key={bar.x}
            data-side={bar.side}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill={bar.side === "home" ? homeColour : awayColour}
          />
        ))}
        <line
          x1={0}
          x2={WIDTH}
          y1={HEIGHT / 2}
          y2={HEIGHT / 2}
          stroke="currentColor"
          opacity={0.4}
        />
      </svg>
    </section>
  );
}
