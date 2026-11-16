import {
  type Career,
  completeMatchday,
  createCareer,
  generateLeague,
  getNextFixture,
  simulateFixture,
} from "../game";

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

const playOneMatchday = (career: Career): Career => {
  const fixture = must(getNextFixture(career.season, career.userClubId), "season over");
  const next = completeMatchday(career, simulateFixture(career, fixture));
  if (!next.ok) throw new Error(next.error);
  return next.career;
};

/** Test fixture: a career for the seed's club at `clubIndex`, with `matchdays` matchdays played. */
export const careerAfter = (matchdays: number, seed = 11, clubIndex = 2): Career =>
  Array.from({ length: matchdays }).reduce<Career>(playOneMatchday, newCareer(seed, clubIndex));

/** The first `count` ids of the user's starting eleven. */
export const startersOf = (career: Career, count: number): string[] =>
  career.squadPlan.starters.slice(0, count);
