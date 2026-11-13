import type { Side } from "../../engine";

export type MomentumBar = {
  side: Side;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MomentumBarOptions = {
  width: number;
  height: number;
  /** The value that fills half the height at least, so a quiet match does not look dramatic. */
  minScale: number;
};

/** Turns a signed danger series into bars around a centre line: home above, away below. */
export const momentumBars = (
  series: readonly number[],
  { width, height, minScale }: MomentumBarOptions,
): MomentumBar[] => {
  const half = height / 2;
  const scale = Math.max(minScale, ...series.map(Math.abs));
  const slice = width / series.length;
  return series.map((value, index) => {
    const barHeight = (Math.abs(value) / scale) * half;
    const side: Side = value >= 0 ? "home" : "away";
    return {
      side,
      x: index * slice,
      y: side === "home" ? half - barHeight : half,
      width: slice,
      height: barHeight,
    };
  });
};
