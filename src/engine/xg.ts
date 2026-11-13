import { clamp } from "./pitch";

const MAX_XG = 0.37;

/**
 * Expected goals of a shot taken at the given attacking progress (0..1, 1 = on the goal line)
 * and lateral position `y` (0.5 = centre). Closer and more central shots are worth more.
 */
export const shotXg = (progress: number, y: number): number => {
  const centrality = 1 - Math.min(1, Math.abs(y - 0.5) * 2);
  const closeness = Math.max(0, progress - 0.76) * 1.5 * (0.35 + 0.65 * centrality);
  return clamp(0.62 * Math.min(0.6, 0.03 + closeness), 0, MAX_XG);
};
