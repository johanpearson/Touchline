import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import {
  EMPTY_MATCH_CHANGES,
  type MatchChange,
  type MatchChanges,
  planChange,
} from "./plan-change";
import type { MatchReport } from "./update-condition";

/**
 * One change the user made during a match: what was asked (`MatchChange`, with the match minute) and
 * the engine time in seconds it was applied at. The session keeps these so the rules state
 * (substitutions, windows and shouts used) can be rebuilt by `replayMatchEdits` after a reload.
 */
export type MatchEdit = MatchChange & { time: number };

/** The rules state after a list of edits. `report` is absent when nothing was changed. */
export type ReplayedEdits = { changes: MatchChanges; report?: MatchReport };

/**
 * Plans every edit again, in order, from the kickoff plan. Returns null if one is refused, which
 * means the session no longer fits the career. Pure; the career is not changed.
 */
export const replayMatchEdits = (
  career: Career,
  fixture: Fixture,
  edits: readonly MatchEdit[],
): ReplayedEdits | null => {
  let changes = EMPTY_MATCH_CHANGES;
  let report: MatchReport | undefined;
  for (const { time: _time, ...change } of edits) {
    const planned = planChange(career, fixture, change, { previous: changes });
    if (!planned.ok) return null;
    changes = planned.changes;
    report = planned.report;
  }
  return report ? { changes, report } : { changes };
};
