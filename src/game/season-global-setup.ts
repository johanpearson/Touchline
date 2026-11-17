import type { TestProject } from "vitest/node";
import { aCareer } from "./career-builders";
import { extendTrail, type SeasonTrail } from "./season-trail";

const MATCHDAYS = 26;

/**
 * Vitest global setup: simulates the default career's first season once, so the dozen test files that
 * need a played season (`playMatchdays(aCareer(), n)` in season-test-helpers.ts) do not each simulate
 * the same 182 matches in their own worker. Careers are plain JSON data, so they pass to the workers.
 */
export function setup({ provide }: TestProject) {
  const trail: SeasonTrail = extendTrail([aCareer()], MATCHDAYS);
  provide("defaultSeasonTrail", trail);
}
