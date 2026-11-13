import { createRng, type Rng } from "../engine";
import type { Club } from "./club";
import { generateClubIdentities } from "./generate-club-identities";
import { generateSquad } from "./generate-squad";
import type { League } from "./league";

export type LeagueSpec = {
  seed: number;
  /** An even number from 12 to 16. Defaults to 14. */
  clubCount?: number;
};

export type LeagueError = "invalid-club-count";

export type LeagueResult = { ok: true; league: League } | { ok: false; error: LeagueError };

export const DEFAULT_CLUB_COUNT = 14;
export const CLUB_COUNT_RANGE = { min: 12, max: 16 } as const;

/** Squad strengths run evenly from `min` to `max` (plus jitter), so there are favourites and underdogs. */
export const STRENGTH_SPREAD = { min: 0.3, max: 0.7 } as const;
/** Maximum random shift of a club's strength, as a fraction of the gap between neighbouring clubs. */
const STRENGTH_JITTER = 0.3;

/** Fictional league names (proper nouns, not translated). */
export const LEAGUE_NAMES: readonly string[] = [
  "Norrlandsligan",
  "Svealandsserien",
  "Götalandsligan",
  "Kustserien",
  "Bergslagsligan",
  "Mälarserien",
  "Fjällserien",
  "Skärgårdsligan",
];

const isValidClubCount = (count: number): boolean =>
  Number.isInteger(count) &&
  count % 2 === 0 &&
  count >= CLUB_COUNT_RANGE.min &&
  count <= CLUB_COUNT_RANGE.max;

const shuffled = <T>(list: readonly T[], rng: Rng): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Evenly spaced strengths with seeded jitter, shuffled so strength is unrelated to list order. */
const strengthsFor = (count: number, rng: Rng): number[] => {
  const gap = (STRENGTH_SPREAD.max - STRENGTH_SPREAD.min) / (count - 1);
  const strengths = Array.from({ length: count }, (_, i) => {
    const jitter = (rng.next() * 2 - 1) * STRENGTH_JITTER * gap;
    return clamp01(STRENGTH_SPREAD.min + i * gap + jitter);
  });
  return shuffled(strengths, rng);
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Turns a seed into a complete league of fictional clubs with squads of varied strength.
 * Deterministic: the same seed and club count always give an identical league.
 */
export const generateLeague = (spec: LeagueSpec): LeagueResult => {
  const clubCount = spec.clubCount ?? DEFAULT_CLUB_COUNT;
  if (!isValidClubCount(clubCount)) return { ok: false, error: "invalid-club-count" };

  const rng = createRng(spec.seed).fork("league");
  const identities = generateClubIdentities(clubCount, rng.fork("identities"));
  if (!identities.ok) return { ok: false, error: "invalid-club-count" };
  const strengths = strengthsFor(clubCount, rng.fork("strengths"));
  const name = rng.fork("name").pick(LEAGUE_NAMES);

  const clubs: Club[] = [];
  const players = identities.identities.flatMap((identity, i) => {
    const squad = generateSquad(
      { clubId: identity.id, strength: strengths[i] as number },
      rng.fork(`squad-${identity.id}`),
    );
    clubs.push({ ...identity, playerIds: squad.map((p) => p.id) });
    return squad;
  });

  return { ok: true, league: { id: slugify(name), name, clubs, players } };
};
