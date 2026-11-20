import { describe, expect, it } from "vitest";
import {
  EMPTY_MATCH_CHANGES,
  getNextFixture,
  MAX_SUBSTITUTION_WINDOWS,
  MAX_SUBSTITUTIONS,
  type MatchChanges,
} from "../../game";
import { changesSourceFor } from "../match-changes-source";
import { careerAfter } from "../test-career";
import {
  type ChangeDraft,
  type ChangesEditor,
  changeOf,
  ERROR_KEYS,
  editorAt,
  energyOf,
  freshDraft,
  hasPending,
  noWindowLeft,
  positionOn,
  ratingAt,
  replacementsFor,
  shoutBlock,
  starterCanGoOff,
  substitutionsLeft,
  windowsLeft,
} from "./half-time-model";
import { shoutExpired } from "./use-match-changes";

const career = careerAfter(0);
const fixture = getNextFixture(career.season, career.userClubId);
if (!fixture) throw new Error("fixture");
const source = changesSourceFor(career, fixture);

const editorFor = (
  previous: MatchChanges = EMPTY_MATCH_CHANGES,
  moment: { minute: number; halfTime?: boolean; energy?: Record<string, number> } = { minute: 60 },
): ChangesEditor =>
  editorAt(source(previous), {
    minute: moment.minute,
    halfTime: moment.halfTime ?? false,
    energy: moment.energy ?? {},
  });

const [off1, off2] = career.squadPlan.starters.slice(1, 3) as [string, string];
const [on1, on2] = career.squadPlan.bench as [string, string];

/** The state after the editor's own change was planned. */
const stateAfter = (editor: ChangesEditor, draft: ChangeDraft): MatchChanges => {
  const planned = editor.plan(draft);
  if (!planned.ok) throw new Error(planned.error);
  return planned.changes;
};

describe("replacementsFor and starterCanGoOff", () => {
  it("offers every bench player whatever the position", () => {
    const editor = editorFor();
    expect(replacementsFor(editor, [])).toEqual([...editor.bench]);
  });

  it("leaves out a bench player who is already in a pending change", () => {
    const editor = editorFor();
    expect(replacementsFor(editor, [{ off: off1, on: on1 }])).not.toContain(on1);
  });

  it("does not let a player go off twice", () => {
    const editor = editorFor();
    expect(starterCanGoOff(editor, off1, [{ off: off1, on: on1 }])).toBe(false);
    expect(starterCanGoOff(editor, off2, [{ off: off1, on: on1 }])).toBe(true);
  });
});

describe("rating, position and energy", () => {
  it("rates a player at the position he plays, lower out of his own position", () => {
    const editor = editorFor();
    const keeper = editor.starters.find((id) => positionOn(editor, id) === "GK") as string;
    const outfield = editor.bench.find((id) => positionOn(editor, id) !== "GK") as string;
    expect(ratingAt(editor, outfield, positionOn(editor, outfield))).toBeGreaterThan(
      ratingAt(editor, outfield, "GK"),
    );
    expect(ratingAt(editor, keeper, "GK")).toBeGreaterThan(0);
  });

  it("uses the live energy over the condition's fitness", () => {
    const editor = editorFor(EMPTY_MATCH_CHANGES, { minute: 60, energy: { [off1]: 41.4 } });
    expect(energyOf(editor, off1)).toBe(41);
    expect(energyOf(editor, on1)).toBe(Math.round(career.condition[on1]?.fitness ?? 100));
  });

  it("rates a substitute at the position of the player he replaced", () => {
    const state = stateAfter(editorFor(), {
      subs: [{ off: off1, on: on1 }],
      tactics: editorFor().tactics,
    });
    const editor = editorFor(state, { minute: 70 });
    const replaced = career.league.players.find((p) => p.id === off1)?.position;
    expect(positionOn(editor, on1)).toBe(replaced);
  });
});

describe("limits", () => {
  it("counts substitutions left including the pending ones", () => {
    const editor = editorFor();
    expect(substitutionsLeft(editor, 0)).toBe(MAX_SUBSTITUTIONS);
    expect(substitutionsLeft(editor, 2)).toBe(MAX_SUBSTITUTIONS - 2);
    expect(substitutionsLeft(editor, 9)).toBe(0);
  });

  it("counts windows from distinct minutes and ignores half-time", () => {
    const first = stateAfter(editorFor(EMPTY_MATCH_CHANGES, { minute: 45, halfTime: true }), {
      subs: [{ off: off1, on: on1 }],
      tactics: editorFor().tactics,
    });
    expect(windowsLeft(editorFor(first))).toBe(MAX_SUBSTITUTION_WINDOWS);
    const second = stateAfter(editorFor(first, { minute: 60 }), {
      subs: [{ off: off2, on: on2 }],
      tactics: editorFor().tactics,
    });
    expect(windowsLeft(editorFor(second, { minute: 61 }))).toBe(MAX_SUBSTITUTION_WINDOWS - 1);
  });

  it("says no window is left only for a new minute once all three are used", () => {
    const changes: MatchChanges = {
      shouts: [],
      substitutions: [50, 60, 70].map((minute, i) => ({
        minute,
        halfTime: false,
        off: `x${i}`,
        on: `y${i}`,
      })),
    };
    expect(noWindowLeft(editorFor(changes, { minute: 80 }))).toBe(true);
    expect(noWindowLeft(editorFor(changes, { minute: 70 }))).toBe(false);
    expect(noWindowLeft(editorFor(changes, { minute: 45, halfTime: true }))).toBe(false);
  });
});

describe("drafts", () => {
  it("starts without pending changes", () => {
    const editor = editorFor();
    expect(hasPending(editor, freshDraft(editor))).toBe(false);
  });

  it.each([
    ["a substitution", (d: ChangeDraft): ChangeDraft => ({ ...d, subs: [{ off: off1, on: on1 }] })],
    ["a shout", (d: ChangeDraft): ChangeDraft => ({ ...d, shout: "pushUp" })],
    [
      "new tactics",
      (d: ChangeDraft): ChangeDraft => ({
        ...d,
        tactics: { ...d.tactics, width: d.tactics.width === "wide" ? "narrow" : "wide" },
      }),
    ],
  ])("has pending changes after %s", (_name, edit) => {
    const editor = editorFor();
    expect(hasPending(editor, edit(freshDraft(editor)))).toBe(true);
  });

  it("asks for new tactics only when they differ from those in force", () => {
    const editor = editorFor();
    expect(changeOf(editor, freshDraft(editor)).tactics).toBeUndefined();
    const wider = {
      ...editor.tactics,
      width: editor.tactics.width === "wide" ? "narrow" : "wide",
    } as const;
    expect(changeOf(editor, { subs: [], tactics: wider }).tactics).toEqual(wider);
  });

  it("plans a valid draft with the minutes the rules give", () => {
    const editor = editorFor(EMPTY_MATCH_CHANGES, { minute: 62 });
    const planned = editor.plan({ subs: [{ off: off1, on: on1 }], tactics: editor.tactics });
    expect(planned.ok && planned.report.minutes[off1]).toBe(62);
  });

  it("refuses a draft the rules refuse, naming a message for every error", () => {
    const editor = editorFor();
    const planned = editor.plan({ subs: [{ off: "nobody", on: on1 }], tactics: editor.tactics });
    expect(planned).toEqual({ ok: false, error: "player-not-on-pitch" });
    for (const key of Object.values(ERROR_KEYS)) expect(key).toMatch(/^changes\.error\./);
  });

  it("explains why a shout is blocked", () => {
    const editor = editorFor();
    expect(shoutBlock(editor, freshDraft(editor), "pushUp")).toBeUndefined();
    const given = stateAfter(editor, { ...freshDraft(editor), shout: "pushUp" });
    const later = editorFor(given, { minute: 65 });
    expect(shoutBlock(later, freshDraft(later), "holdShape")).toBe("shout-active");
  });
});

describe("shoutExpired", () => {
  const shouted: MatchChanges = {
    substitutions: [],
    shouts: [{ kind: "pushUp", minute: 60 }],
  };

  it("is false without a shout and while the shout is in force", () => {
    expect(shoutExpired(EMPTY_MATCH_CHANGES, [], 80)).toBe(false);
    expect(shoutExpired(shouted, [], 69)).toBe(false);
  });

  it("is true once the shout has run out and nothing has brought the tactics up to date", () => {
    expect(shoutExpired(shouted, [{ time: 3600, minute: 60, shout: "pushUp" }], 70)).toBe(true);
  });

  it("is false once a change was made at or after the end of the shout", () => {
    expect(shoutExpired(shouted, [{ time: 4200, minute: 70 }], 75)).toBe(false);
  });
});
