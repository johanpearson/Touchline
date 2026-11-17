import { type Career, createCareer, extendTrail, generateLeague, type SeasonTrail } from "../game";

const must = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(what);
  return value;
};

const newCareer = (seed: number, clubIndex: number): Career => {
  const league = generateLeague({ seed });
  if (!league.ok) throw new Error("league");
  const userClubId = must(league.league.clubs[clubIndex], "club").id;
  const created = createCareer({ seed, userClubId });
  if (!created.ok) throw new Error("career");
  return created.career;
};

// One trail of played matchdays per start career: `careerAfter(3)` and `careerAfter(7)` share their first
// three matchdays instead of simulating them again (a matchday is seven simulated matches).
const trails = new Map<string, SeasonTrail>();

/** Test fixture: a career for the seed's club at `clubIndex`, with `matchdays` matchdays played. */
export const careerAfter = (matchdays: number, seed = 11, clubIndex = 2): Career => {
  const key = `${seed}:${clubIndex}`;
  const trail = trails.get(key) ?? [newCareer(seed, clubIndex)];
  trails.set(key, trail);
  return extendTrail(trail, matchdays)[matchdays] as Career;
};

/** The first `count` ids of the user's starting eleven. */
export const startersOf = (career: Career, count: number): string[] =>
  career.squadPlan.starters.slice(0, count);
