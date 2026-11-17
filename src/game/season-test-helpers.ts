import { inject } from "vitest";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { finishSeason } from "./finish-season";
import { passiveUserOffSeason } from "./passive-user-test-helpers";
import { extendTrail, type SeasonTrail } from "./season-trail";
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

declare module "vitest" {
  export interface ProvidedContext {
    /** The default career played through a whole season, simulated once per test run (season-global-setup.ts). */
    defaultSeasonTrail?: SeasonTrail;
  }
}

/**
 * The trail of a start career. Every test file runs in its own worker, so a trail made in one file is
 * not seen by another; the default career's season is therefore simulated once per run in a vitest
 * global setup and handed to every worker. Without it (another vitest config) the season is played here.
 */
const trails = new WeakMap<Career, SeasonTrail>();

const trailOf = (start: Career): SeasonTrail => {
  const known = trails.get(start);
  if (known) return known;
  const provided = start === aCareer() ? inject("defaultSeasonTrail") : undefined;
  const trail: SeasonTrail = provided ? [start, ...provided.slice(1)] : [start];
  trails.set(start, trail);
  return trail;
};

/** Plays `matchdays` rounds of the current season with simulated user results. Test helper. */
export const playMatchdays = (start: Career, matchdays: number): Career =>
  extendTrail(trailOf(start), matchdays)[matchdays] as Career;

/** Plays `seasons` full seasons (rolling over between them) and then `extraMatchdays` more. */
export const playSeasons = (start: Career, seasons: number, extraMatchdays = MATCHDAYS): Career =>
  memoised(start, `seasons:${seasons}:${extraMatchdays}`, () =>
    playSeasonsUnmemoised(start, seasons, extraMatchdays),
  );

const playSeasonsUnmemoised = (start: Career, seasons: number, extraMatchdays: number): Career => {
  let career = start;
  for (let s = 1; s < seasons; s++) {
    career = rolledOver(playMatchdays(career, MATCHDAYS));
  }
  return playMatchdays(career, extraMatchdays);
};

/** Finishes a completed season and starts the next one, the user passive (no market use). Test helper. */
export const rolledOver = (career: Career): Career => {
  const finished = finishSeason(career);
  if (!finished.ok) throw new Error(finished.error);
  const next = startNextSeason(passiveUserOffSeason(finished.career));
  if (!next.ok) throw new Error(next.error);
  return next.career;
};
