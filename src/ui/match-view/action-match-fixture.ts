import type { PerSide } from "../../engine";
import { createCareer, generateLeague, getNextFixture } from "../../game";
import { matchSetupFor } from "../match-setup";

/** A fixed fixture of a generated career, for tests of the match view. */
export const anActionMatchSetup = (seed = 5) => {
  const league = generateLeague({ seed });
  if (!league.ok) throw new Error("league");
  const created = createCareer({ seed, userClubId: league.league.clubs[0]?.id ?? "" });
  if (!created.ok) throw new Error("career");
  const career = created.career;
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("fixture");
  const colours: PerSide<string> = { home: "#ff4b5c", away: "#2f9bff" };
  const setup = matchSetupFor(career, fixture);
  return { career, fixture, setup: { ...setup, colours } };
};
