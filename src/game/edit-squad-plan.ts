import type { TeamTactics } from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Career } from "./career";
import type { Formation } from "./formation";
import { type Lineup, type LineupError, validateLineup } from "./lineup";
import { clubSquad } from "./squad-plan";

export type SetLineupResult = { ok: true; career: Career } | { ok: false; error: LineupError };

const userSquad = (career: Career) => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) throw new RangeError(`Unknown user club: ${career.userClubId}`);
  return clubSquad(club, career.league.players);
};

/**
 * Replaces the user's formation, starters and bench after validating them against the squad.
 * An invalid lineup returns the validation error and the career stays as it was.
 */
export const setLineup = (career: Career, lineup: Lineup): SetLineupResult => {
  const checked = validateLineup(lineup, userSquad(career));
  if (!checked.ok) return checked;
  const { formation, starters, bench } = lineup;
  return {
    ok: true,
    career: {
      ...career,
      squadPlan: {
        formation,
        starters: [...starters],
        bench: [...bench],
        tactics: career.squadPlan.tactics,
      },
    },
  };
};

/** Replaces the user's tactics and keeps the lineup. */
export const setTactics = (career: Career, tactics: TeamTactics): Career => ({
  ...career,
  squadPlan: { ...career.squadPlan, tactics: { ...tactics } },
});

/**
 * Auto-picks starters and bench for a formation from the squad's current condition and keeps the
 * tactics. Throws a RangeError (programmer error) if the squad cannot fill the formation.
 */
export const autoPickUserLineup = (career: Career, formation: Formation): Career => ({
  ...career,
  squadPlan: {
    ...autoPickLineup(userSquad(career), formation, career.condition),
    tactics: career.squadPlan.tactics,
  },
});
