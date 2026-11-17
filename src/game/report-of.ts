import type { TeamTactics } from "../engine";
import type { Lineup } from "./lineup";
import { liveSquadAfter, minutesOnPitch, type SubstitutionRecord } from "./live-squad";
import type { Player } from "./player";
import { type ShoutRecord, shoutFatigue } from "./shouts";
import type { MatchReport } from "./update-condition";

/**
 * Minutes on the pitch and shout fatigue of every player of a club if the match ended at 90 minutes,
 * from the club's starting `plan`, the substitutions and shouts made and the base tactics.
 */
export const reportOf = (
  plan: Lineup,
  squadPlayers: readonly Player[],
  changes: { substitutions: readonly SubstitutionRecord[]; shouts: readonly ShoutRecord[] },
  base: TeamTactics,
): MatchReport => {
  const live = liveSquadAfter(plan, changes.substitutions, () => "MID");
  const minutes: Record<string, number> = {};
  const fatigue: Record<string, number> = {};
  for (const { id } of squadPlayers) {
    minutes[id] = minutesOnPitch(id, plan, live);
    const from = plan.starters.includes(id) ? 0 : (live.cameOn[id] ?? 0);
    const to = from + minutes[id];
    const tired = shoutFatigue(base, changes.shouts, from, to);
    if (tired > 0) fatigue[id] = tired;
  }
  return { minutes, fatigue };
};
