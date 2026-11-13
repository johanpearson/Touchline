import type { Rng } from "../engine";

export type Fixture = {
  id: string;
  /** 1-based. */
  matchday: number;
  homeClubId: string;
  awayClubId: string;
};

export type FixtureError = "invalid-club-count" | "duplicate-club-ids";

export type FixtureResult = { ok: true; fixtures: Fixture[] } | { ok: false; error: FixtureError };

const shuffled = <T>(list: readonly T[], rng: Rng): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

/** One round of the circle method: slot 0 is fixed, the others rotate by `round`. */
const roundPairs = (slots: readonly string[], round: number): Array<[string, string]> => {
  const n = slots.length;
  const rotating = slots.slice(1);
  const at = (position: number): string =>
    position === 0 ? (slots[0] as string) : (rotating[(position - 1 + round) % (n - 1)] as string);
  return Array.from({ length: n / 2 }, (_, i): [string, string] => {
    const a = at(i);
    const b = at(n - 1 - i);
    // The fixed slot alternates every round; the others alternate by pair index, which shifts as slots rotate.
    const aHome = i === 0 ? round % 2 === 0 : i % 2 === 0;
    return aHome ? [a, b] : [b, a];
  });
};

/**
 * Double round-robin schedule using the circle method. The first half has n-1 matchdays,
 * the second half repeats it with home and away swapped. The seed decides which club gets which slot.
 */
export const generateFixtures = (clubIds: readonly string[], rng: Rng): FixtureResult => {
  const n = clubIds.length;
  if (n < 2 || n % 2 !== 0) return { ok: false, error: "invalid-club-count" };
  if (new Set(clubIds).size !== n) return { ok: false, error: "duplicate-club-ids" };

  const slots = shuffled(clubIds, rng);
  const fixtures: Fixture[] = [];
  const add = (matchday: number, homeClubId: string, awayClubId: string): void => {
    fixtures.push({ id: `md${matchday}-${fixtures.length}`, matchday, homeClubId, awayClubId });
  };

  const rounds = Array.from({ length: n - 1 }, (_, round) => roundPairs(slots, round));
  rounds.forEach((pairs, round) => {
    for (const [home, away] of pairs) add(round + 1, home, away);
  });
  rounds.forEach((pairs, round) => {
    for (const [home, away] of pairs) add(n + round, away, home);
  });
  return { ok: true, fixtures };
};
