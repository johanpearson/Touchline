import { createRng } from "../engine";
import type { Season } from "./career";
import { generateFixtures } from "./generate-fixtures";

/**
 * A fresh season: a seeded fixture list (the season number is part of the seed stream, so each
 * season has a different schedule), no results, and the first matchday up next.
 * Throws a RangeError (programmer error) if the club ids cannot be scheduled.
 */
export const createSeason = (
  careerSeed: number,
  seasonNumber: number,
  clubIds: readonly string[],
): Season => {
  const rng = createRng(careerSeed).fork(`fixtures-season-${seasonNumber}`);
  const schedule = generateFixtures(clubIds, rng);
  if (!schedule.ok) throw new RangeError(`Cannot schedule a season: ${schedule.error}`);
  return { number: seasonNumber, fixtures: schedule.fixtures, results: [], currentMatchday: 1 };
};
