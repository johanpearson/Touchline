import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import type { Fixture } from "./generate-fixtures";
import { type MatchEdit, replayMatchEdits } from "./match-edits";
import { EMPTY_MATCH_CHANGES, planChange } from "./plan-change";
import type { MatchReport } from "./update-condition";

const career = aCareer(7);
const fixture = career.season.fixtures.find(
  (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
) as Fixture;
const [off1, off2] = career.squadPlan.starters.slice(1, 3) as [string, string];
const [on1, on2] = career.squadPlan.bench as [string, string];

describe("replayMatchEdits", () => {
  it("gives an empty state and no report for no edits", () => {
    expect(replayMatchEdits(career, fixture, [])).toEqual({ changes: EMPTY_MATCH_CHANGES });
  });

  /** The state and report of the edits planned one by one, as the match screen plans them. */
  const plannedOneByOne = (edits: readonly MatchEdit[]) => {
    let previous = EMPTY_MATCH_CHANGES;
    let report: MatchReport | undefined;
    for (const { time: _time, ...change } of edits) {
      const planned = planChange(career, fixture, change, { previous });
      if (!planned.ok) throw new Error(planned.error);
      previous = planned.changes;
      report = planned.report;
    }
    return { changes: previous, report };
  };

  const edits: MatchEdit[] = [
    { time: 3720, minute: 62, substitutions: [{ off: off1, on: on1 }] },
    { time: 4800, minute: 80, shout: "pushUp", substitutions: [{ off: off2, on: on2 }] },
  ];

  it("gives the state and report the same edits planned one by one give", () => {
    expect(replayMatchEdits(career, fixture, edits)).toEqual(plannedOneByOne(edits));
  });

  it("counts the minutes from the minute of each edit", () => {
    const report = replayMatchEdits(career, fixture, edits)?.report;
    expect(report?.minutes[off1]).toBe(62);
    expect(report?.minutes[on2]).toBe(10);
  });

  it("returns null when an edit is no longer valid", () => {
    const bad: MatchEdit = { time: 100, minute: 10, substitutions: [{ off: "nobody", on: on1 }] };
    expect(replayMatchEdits(career, fixture, [bad])).toBeNull();
  });
});
