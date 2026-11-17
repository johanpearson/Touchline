import type { Career } from "./career";
import { completeMatchday } from "./complete-matchday";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";

/**
 * The careers of one played season, for tests: `trail[n]` is the career after `n` matchdays and
 * `trail[0]` the career the trail starts from. A season is 182 simulated matches, so it is played
 * once and every test reads the prefix it needs.
 */
export type SeasonTrail = Career[];

/** Plays matchdays (the user's result is simulated) until `trail[upTo]` exists. Mutates and returns the trail. */
export const extendTrail = (trail: SeasonTrail, upTo: number): SeasonTrail => {
  while (trail.length <= upTo) {
    const career = trail[trail.length - 1] as Career;
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) throw new Error("season ended early");
    const outcome = completeMatchday(career, simulateFixture(career, fixture));
    if (!outcome.ok) throw new Error(outcome.error);
    trail.push(outcome.career);
  }
  return trail;
};
