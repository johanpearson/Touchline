import {
  type Career,
  type Fixture,
  formationInForce,
  liveSquadAfter,
  type MatchChange,
  type MatchChanges,
  type PlayerPosition,
  planChange,
} from "../game";
import type { ChangesBase, ChangesSource } from "./match-view/half-time-model";

/**
 * The changes source of the user's match: after the changes made so far (`previous`) it tells who is
 * on the pitch and on the bench and validates the next request with `planChange`. The career holds
 * the plan the match was kicked off with.
 */
export const changesSourceFor =
  (career: Career, fixture: Fixture): ChangesSource =>
  (previous: MatchChanges): ChangesBase => {
    const club = career.league.clubs.find((c) => c.id === career.userClubId);
    const players = career.league.players.filter((p) => club?.playerIds.includes(p.id));
    const natural = (id: string): PlayerPosition =>
      players.find((p) => p.id === id)?.position ?? "MID";
    const live = liveSquadAfter(
      career.squadPlan,
      previous.substitutions,
      natural,
      previous.formations,
    );
    return {
      players,
      starters: live.starters,
      bench: live.bench,
      condition: career.condition,
      played: live.played,
      formation: formationInForce(career.squadPlan.formation, previous.formations),
      tactics: previous.tactics ?? career.squadPlan.tactics,
      changes: previous,
      plan: (change: MatchChange) => planChange(career, fixture, change, { previous }),
    };
  };
