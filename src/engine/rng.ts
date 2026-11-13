/** Deterministic, forkable random number generator. All engine randomness goes through this. */
export type Rng = {
  /** Uniform float in [0, 1). */
  next: () => number;
  /** Uniform integer in [min, max], both inclusive. */
  int: (min: number, max: number) => number;
  /** Uniformly chosen element of a non-empty list. */
  pick: <T>(list: readonly T[]) => T;
  /** True with probability `p` (0 to 1). */
  chance: (p: number) => boolean;
  /**
   * Independent stream derived from this generator's seed and a name.
   * Does not consume or depend on this generator's state.
   */
  fork: (name: string) => Rng;
};

const hashString = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
};

const mixSeed = (seed: number, name: string): number =>
  Math.imul(hashString(name) ^ Math.imul(seed, 0x9e3779b1), 0x85ebca6b) >>> 0;

/** Creates a mulberry32-based generator. The same seed always gives the same sequence. */
export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new RangeError(`Invalid integer range [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  const pick = <T>(list: readonly T[]): T => {
    if (list.length === 0) throw new RangeError("Cannot pick from an empty list");
    return list[Math.floor(next() * list.length)] as T;
  };

  const chance = (p: number): boolean => {
    if (!(p >= 0 && p <= 1)) throw new RangeError(`Probability out of range: ${p}`);
    return next() < p;
  };

  const fork = (name: string): Rng => createRng(mixSeed(seed >>> 0, name));

  return { next, int, pick, chance, fork };
};
