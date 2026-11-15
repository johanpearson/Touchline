import type { Career } from "./career";
import { completeMatchday } from "./complete-matchday";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";
import { startNextSeason } from "./start-next-season";

const MATCHDAYS = 26;

/**
 * Careers are immutable and every match is deterministic, so a played career is the same value
 * each time. A full season takes seconds on the action engine, so repeated calls with the same
 * starting career (by identity) reuse the first result.
 */
const played = new WeakMap<Career, Map<string, Career>>();

const memoised = (start: Career, key: string, play: () => Career): Career => {
  const results = played.get(start) ?? new Map<string, Career>();
  played.set(start, results);
  const known = results.get(key);
  if (known) return known;
  const career = play();
  results.set(key, career);
  return career;
};

/** Plays `matchdays` rounds of the current season with simulated user results. Test helper. */
export const playMatchdays = (start: Career, matchdays: number): Career =>
  memoised(start, `matchdays:${matchdays}`, () => playUnmemoised(start, matchdays));

const playUnmemoised = (start: Career, matchdays: number): Career => {
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
export const playSeasons = (start: Career, seasons: number, extraMatchdays = MATCHDAYS): Career =>
  memoised(start, `seasons:${seasons}:${extraMatchdays}`, () =>
    playSeasonsUnmemoised(start, seasons, extraMatchdays),
  );

const playSeasonsUnmemoised = (start: Career, seasons: number, extraMatchdays: number): Career => {
  let career = start;
  for (let s = 1; s < seasons; s++) {
    const next = startNextSeason(playMatchdays(career, MATCHDAYS));
    if (!next.ok) throw new Error(next.error);
    career = next.career;
  }
  return playMatchdays(career, extraMatchdays);
};
