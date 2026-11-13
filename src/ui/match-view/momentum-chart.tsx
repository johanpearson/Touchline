import type { MatchEvent } from "../../engine";
import { momentumSeries } from "../../engine";
import { useI18n } from "../i18n-provider";
import { momentumBars } from "./momentum-bars";

/** The match is shown in buckets of this many seconds (three minutes). */
export const BUCKET_SECONDS = 180;
const WIDTH = 300;
const HEIGHT = 80;
/** Danger sum of a bucket that fills the chart in a normal match. */
const MIN_SCALE = 1.5;

export type MomentumChartProps = {
  events: readonly MatchEvent[];
  matchTime: number;
  homeColour: string;
  awayColour: string;
};

/** Signed pressure over time: the home team's above the line, the away team's below it. */
export function MomentumChart({ events, matchTime, homeColour, awayColour }: MomentumChartProps) {
  const { t } = useI18n();
  const bars = momentumBars(momentumSeries(events, matchTime, BUCKET_SECONDS), {
    width: WIDTH,
    height: HEIGHT,
    minScale: MIN_SCALE,
  });
  return (
    <section className="panel" aria-labelledby="chart-title">
      <h2 id="chart-title">{t("chart.title")}</h2>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={t("chart.label")}
        data-testid="momentum-chart"
        style={{ width: "100%", display: "block" }}
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
