import {
  type Career,
  createCareer,
  extendTrail,
  finishSeason,
  generateLeague,
  generateOffers,
  releasePlayer,
  type SeasonTrail,
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

const RICH = 1_000_000;

/**
 * Test fixture: a career with the transfer window open, rich clubs, offers for the user's players
 * and two released players in the free-agent pool. Built without playing a season.
 */
export const careerInWindow = (seed = 11, clubIndex = 2): Career => {
  const base = careerAfter(0, seed, clubIndex);
  const finances = Object.fromEntries(
    base.league.clubs.map((c) => [c.id, { balance: RICH, baseIncome: RICH }]),
  );
  const open: Career = { ...base, window: "open", finances };
  const user = must(
    open.league.clubs.find((c) => c.id === open.userClubId),
    "user club",
  );
  const spare = user.playerIds.filter((id) => !open.squadPlan.starters.includes(id)).slice(-6);
  const released = spare.reduce((career, id) => {
    const outcome = releasePlayer(career, id);
    return outcome.ok && freeAgentCount(career) < 2 ? outcome.career : career;
  }, open);
  return generateOffers(released);
};

const freeAgentCount = (career: Career): number => career.freeAgentIds.length;

/** Test fixture: the first season played to the end and finished, so the off-season window is open. */
export const careerInOffSeason = (seed = 11, clubIndex = 2): Career => {
  const result = finishSeason(careerAfter(26, seed, clubIndex));
  if (!result.ok) throw new Error(result.error);
  return result.career;
};
