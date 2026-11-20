import { useId } from "react";
import type { ZoneEvent } from "../../engine";
import { momentumSeries } from "../../engine";
import { useI18n } from "../i18n-provider";
import { formatMatchMinute } from "./match-minute";
import { momentumArea } from "./momentum-area";
import { attackingSide } from "./stage-summary";

/** The match is shown in buckets of this many seconds. */
export const BUCKET_SECONDS = 30;
/** A regular match, ninety minutes: the time axis of the chart, stretched by added time. */
const MATCH_SECONDS = 90 * 60;
/** The first half without added time, where the faint divider sits until half-time is played. */
const HALF_SECONDS = 45 * 60;
const WIDTH = 300;
const HEIGHT = 80;
/** Danger sum of a bucket that fills the chart in a normal match. */
const MIN_SCALE = 0.3;

export type MomentumChartProps = {
  events: readonly ZoneEvent[];
  matchTime: number;
  homeColour: string;
  awayColour: string;
  /** Names the sides in the text summary; without them the summary is left out. */
  names?: { home: string; away: string };
  /** Match times of the user's changes, drawn as thin markers. */
  changeTimes?: readonly number[];
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
  changeTimes,
}: MomentumChartProps) {
  const { t } = useI18n();
  const gradientId = useId();
  const halfTime =
    events.find((event) => event.type === "periodChange" && event.period === "halfTime")?.time ??
    HALF_SECONDS;
  const goalEvents = events.filter((event) => event.type === "goal");
  const area = momentumArea(momentumSeries(events, matchTime, BUCKET_SECONDS), {
    width: WIDTH,
    height: HEIGHT,
    minScale: MIN_SCALE,
    bucketSeconds: BUCKET_SECONDS,
    duration: MATCH_SECONDS,
    matchTime,
    halfTime,
    goals: goalEvents.map((goal) => ({ time: goal.time, side: goal.team })),
    changeTimes,
  });
  const goalList = area.goals
    .map((goal) => {
      const minute = formatMatchMinute(goal.time, events);
      return names ? `${minute} ${names[goal.side]}` : minute;
    })
    .join(", ");
  const attacking = attackingSide(events, matchTime);
  const summary = names
    ? attacking
      ? t("match.summary.attack", { team: names[attacking] })
      : t("match.summary.attack.even")
    : undefined;
  const description = [t("chart.label"), summary, goalList && t("chart.goals", { list: goalList })]
    .filter(Boolean)
    .join(". ");
  const sides = [
    { side: "home", colour: homeColour, shape: area.home, fadeFrom: "0%", fadeTo: "100%" },
    { side: "away", colour: awayColour, shape: area.away, fadeFrom: "100%", fadeTo: "0%" },
  ] as const;
  return (
    <section aria-labelledby="chart-title" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="chart-title" className="m-0 mb-2 font-heading text-lg font-semibold">
        {t("chart.title")}
      </h2>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${description}.`}
        data-testid="momentum-chart"
        className="block h-auto w-full"
      >
        <defs>
          {sides.map(({ side, colour, fadeFrom, fadeTo }) => (
            <linearGradient
              key={side}
              id={`${gradientId}-${side}`}
              x1="0"
              x2="0"
              y1={fadeFrom}
              y2={fadeTo}
            >
              <stop offset="0%" stopColor={colour} stopOpacity={0.85} />
              <stop offset="100%" stopColor={colour} stopOpacity={0.15} />
            </linearGradient>
          ))}
        </defs>
        <line
          data-testid="momentum-half-time"
          x1={area.halfTimeX}
          x2={area.halfTimeX}
          y1={0}
          y2={HEIGHT}
          stroke="currentColor"
          opacity={0.15}
          strokeDasharray="2 3"
        />
        {sides.map(({ side, colour, shape }) =>
          shape.area ? (
            <g key={side} data-side={side}>
              <path d={shape.area} fill={`url(#${gradientId}-${side})`} />
              <path d={shape.line} fill="none" stroke={colour} strokeWidth={1} />
            </g>
          ) : null,
        )}
        <line
          x1={0}
          x2={WIDTH}
          y1={area.centreY}
          y2={area.centreY}
          stroke="currentColor"
          opacity={0.4}
        />
        {area.goals.map((goal) => (
          <circle
            key={goal.time}
            data-testid="momentum-goal"
            data-side={goal.side}
            cx={goal.x}
            cy={goal.y}
            r={3}
            fill={goal.side === "home" ? homeColour : awayColour}
            stroke="currentColor"
            strokeWidth={1}
          />
        ))}
        {area.changes.map((change) => (
          <line
            key={change.time}
            data-testid="momentum-change"
            x1={change.x}
            x2={change.x}
            y1={HEIGHT * 0.3}
            y2={HEIGHT * 0.7}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.55}
          />
        ))}
        <line
          data-testid="momentum-playhead"
          x1={area.playheadX}
          x2={area.playheadX}
          y1={0}
          y2={HEIGHT}
          stroke="currentColor"
          opacity={0.7}
        />
      </svg>
    </section>
  );
}
