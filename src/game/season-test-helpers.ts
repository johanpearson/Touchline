import type { Career } from "./career";
import { completeMatchday } from "./complete-matchday";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";
import { startNextSeason } from "./start-next-season";

const MATCHDAYS = 26;

/** Plays `matchdays` rounds of the current season with simulated user results. Test helper. */
export const playMatchdays = (start: Career, matchdays: number): Career => {
  let career = start;
  for (let i = 0; i < matchdays; i++) {
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) throw new Error("season ended early");
    const outcome = completeMatchday(career, simulateFixture(career, fixture));
    if (!outcome.ok) throw new Error(outcome.error);
    career = outcome.career;
  }
  return career;
};

/** Plays `seasons` full seasons (rolling over between them) and then `extraMatchdays` more. */
export const playSeasons = (start: Career, seasons: number, extraMatchdays = MATCHDAYS): Career => {
  let career = start;
  for (let s = 1; s < seasons; s++) {
    const next = startNextSeason(playMatchdays(career, MATCHDAYS));
    if (!next.ok) throw new Error(next.error);
    career = next.career;
  }
  return playMatchdays(career, extraMatchdays);
};
