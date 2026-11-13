import type { Career } from "./career";
import { createCareer } from "./create-career";
import { generateLeague } from "./generate-league";

/** A generated career for tests; the user manages the league's first club. */
export const aCareer = (seed = 1): Career => {
  const generated = generateLeague({ seed });
  if (!generated.ok) throw new Error(generated.error);
  const userClubId = (generated.league.clubs[0] as { id: string }).id;
  const created = createCareer({ seed, userClubId });
  if (!created.ok) throw new Error(created.error);
  return created.career;
};

/** Deep-freezes a value so tests can prove a function does not mutate its input. */
export const deepFreeze = <T>(value: T): T => {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
