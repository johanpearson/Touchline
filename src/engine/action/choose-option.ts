import type { Rng } from "../rng";

/** Draws one option with probability proportional to its weight, using exactly one `rng.next()`. */
export const chooseOption = <T extends { weight: number }>(options: readonly T[], rng: Rng): T => {
  if (options.length === 0) throw new RangeError("Cannot choose from an empty list of options");
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  const draw = rng.next();
  if (total <= 0) return options[0] as T;
  const target = draw * total;
  let cumulative = 0;
  for (const option of options) {
    cumulative += option.weight;
    if (target < cumulative) return option;
  }
  return options.findLast((o) => o.weight > 0) as T;
};
