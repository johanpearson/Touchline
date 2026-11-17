import { useState } from "react";
import type { TeamTactics } from "../../engine";
import type { Career, Formation, LineupError, Player } from "../../game";
import { useCareer } from "../use-career";
import type { LineupEdit } from "./lineup-model";

export type LineupEditing = {
  /** The reason the last lineup edit was rejected, if it was. */
  error: LineupError | null;
  edit: (next: LineupEdit) => void;
  pickFormation: (formation: Formation) => void;
  setTactics: (tactics: TeamTactics) => void;
};

/** The user's squad players of a career, in league order. */
export const squadPlayers = (career: Career): Player[] => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const ids = new Set(club?.playerIds);
  return career.league.players.filter((p) => ids.has(p.id));
};

/**
 * Writes lineup, formation and tactics edits through the career functions. A rejected lineup is kept
 * as `error` (and changes nothing); the next accepted edit clears it.
 */
export function useLineupEdit(career: Career): LineupEditing {
  const { setLineup, setTactics, autoPickLineup } = useCareer();
  const [error, setError] = useState<LineupError | null>(null);
  const plan = career.squadPlan;

  const edit = (next: LineupEdit) => {
    const result = setLineup({
      formation: plan.formation,
      starters: next.starters ?? plan.starters,
      bench: next.bench ?? plan.bench,
    });
    setError(result.ok ? null : result.error);
  };
  const pickFormation = (formation: Formation) => {
    autoPickLineup(formation);
    setError(null);
  };
  return { error, edit, pickFormation, setTactics };
}
