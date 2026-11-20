import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import type { Fixture } from "./generate-fixtures";
import { type MatchEdit, replayMatchEdits } from "./match-edits";
import { EMPTY_MATCH_CHANGES, planChange } from "./plan-change";

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

  it("gives the state and report the same edits planned one by one give", () => {
    const edits: MatchEdit[] = [
      { time: 3720, minute: 62, substitutions: [{ off: off1, on: on1 }] },
      { time: 4800, minute: 80, shout: "pushUp", substitutions: [{ off: off2, on: on2 }] },
    ];
    const first = planChange(career, fixture, edits[0] as MatchEdit);
    if (!first.ok) throw new Error("first");
    const second = planChange(career, fixture, edits[1] as MatchEdit, { previous: first.changes });
    if (!second.ok) throw new Error("second");

    const replayed = replayMatchEdits(career, fixture, edits);

    expect(replayed).toEqual({ changes: second.changes, report: second.report });
    expect(replayed?.report?.minutes[off1]).toBe(62);
    expect(replayed?.report?.minutes[on2]).toBe(10);
  });

  it("returns null when an edit is no longer valid", () => {
    const bad: MatchEdit = { time: 100, minute: 10, substitutions: [{ off: "nobody", on: on1 }] };
    expect(replayMatchEdits(career, fixture, [bad])).toBeNull();
  });
});
