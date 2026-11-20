import type { Side } from "../../engine";

export type MomentumGoal = { time: number; side: Side };

export type MomentumAreaOptions = {
  width: number;
  height: number;
  /** The value that fills half the height at least, so a quiet match does not look dramatic. */
  minScale: number;
  bucketSeconds: number;
  /** The nominal match length in seconds; the time axis stretches if the match runs longer. */
  duration: number;
  /** How far the match has been played, in seconds. The chart is drawn up to here. */
  matchTime: number;
  /** When the first half ended, in seconds. */
  halfTime: number;
  goals: readonly MomentumGoal[];
  /** Match times of the user's changes (substitutions, tactics, shouts), drawn as thin markers. */
  changeTimes?: readonly number[];
};

export type SideArea = {
  /** The closed, filled shape between the curve and the centre line. */
  area: string;
  /** Just the curve, for a thin stroke on the outer edge. */
  line: string;
};

export type MomentumGoalMarker = { side: Side; time: number; x: number; y: number };

export type MomentumArea = {
  home: SideArea;
  away: SideArea;
  centreY: number;
  goals: MomentumGoalMarker[];
  /** One marker per change the clock has reached. */
  changes: { time: number; x: number }[];
  playheadX: number;
  halfTimeX: number;
};

type Point = readonly [x: number, y: number];

const round = (n: number): number => Math.round(n * 100) / 100;
const fmt = ([x, y]: Point): string => `${round(x)},${round(y)}`;

/** A 1-2-1 moving average with the edges repeated: never larger than the largest input. */
const smooth = (values: readonly number[]): number[] =>
  values.map((value, i) => {
    const before = values[i - 1] ?? value;
    const after = values[i + 1] ?? value;
    return (before + 2 * value + after) / 4;
  });

/** Monotone tangents (Fritsch–Carlson), so the curve never overshoots its data points. */
const tangents = (points: readonly Point[]): number[] => {
  const slopes = points.slice(1).map(([x, y], i) => {
    const [px, py] = points[i] as Point;
    return (y - py) / (x - px);
  });
  return points.map((_, i) => {
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === undefined) return after ?? 0;
    if (after === undefined) return before;
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
};

/** `M` and cubic `C` segments through the points. */
const curve = (points: readonly Point[]): string => {
  const [first] = points;
  if (!first) return "";
  const m = tangents(points);
  const segments = points.slice(1).map(([x, y], i) => {
    const [px, py] = points[i] as Point;
    const dx = (x - px) / 3;
    const c1: Point = [px + dx, py + (m[i] as number) * dx];
    const c2: Point = [x - dx, y - (m[i + 1] as number) * dx];
    return `C${fmt(c1)} ${fmt(c2)} ${fmt([x, y])}`;
  });
  return `M${fmt(first)}${segments.join("")}`;
};

const sideArea = (points: readonly Point[], centreY: number): SideArea => {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return { area: "", line: "" };
  const line = curve(points);
  const area = `M${fmt([first[0], centreY])}L${line.slice(1)}L${fmt([last[0], centreY])}Z`;
  return { area, line };
};

/**
 * Turns a signed danger series (one value per bucket, home positive) into the paths of one smooth
 * area per side around a centre line, the goal markers and the playhead. Pure: the component only
 * draws what comes back.
 */
export const momentumArea = (
  series: readonly number[],
  {
    width,
    height,
    minScale,
    bucketSeconds,
    duration,
    matchTime,
    halfTime,
    goals,
    changeTimes = [],
  }: MomentumAreaOptions,
): MomentumArea => {
  const centreY = height / 2;
  const span = Math.max(duration, matchTime);
  const xOf = (seconds: number): number => round((seconds / span) * width);
  const playheadX = xOf(matchTime);

  const home = smooth(series.map((v) => Math.max(v, 0)));
  const away = smooth(series.map((v) => Math.max(-v, 0)));
  const scale = Math.max(minScale, ...home, ...away);
  const centres = series.map((_, i) =>
    xOf((i * bucketSeconds + Math.min((i + 1) * bucketSeconds, matchTime)) / 2),
  );

  const pointsOf = (heights: readonly number[], sign: 1 | -1): Point[] => {
    const inner: Point[] = heights.map((h, i) => [
      centres[i] as number,
      centreY - sign * (h / scale) * centreY,
    ]);
    const first = inner[0];
    const last = inner[inner.length - 1];
    if (!first || !last) return [];
    const anchored: Point[] = [[0, first[1]], ...inner, [playheadX, last[1]]];
    // The curve needs strictly increasing x.
    return anchored.filter((p, i) => i === 0 || p[0] > (anchored[i - 1] as Point)[0]);
  };

  return {
    home: sideArea(pointsOf(home, 1), centreY),
    away: sideArea(pointsOf(away, -1), centreY),
    centreY,
    goals: goals
      .filter((goal) => goal.time <= matchTime)
      .map((goal) => ({ ...goal, x: xOf(goal.time), y: centreY })),
    changes: changeTimes
      .filter((time) => time <= matchTime)
      .map((time) => ({ time, x: xOf(time) })),
    playheadX,
    halfTimeX: xOf(halfTime),
  };
};
