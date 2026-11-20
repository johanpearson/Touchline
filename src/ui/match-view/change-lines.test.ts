import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../../engine";
import { createTranslator } from "../../i18n";
import { changeLines } from "./change-lines";

const names = { b: "Berg", l: "Lindgren", s: "Svensson" };
const context = (locale: "en" | "sv" = "en") => ({
  t: createTranslator(locale).t,
  names,
  side: "home" as const,
  startTactics: NEUTRAL_TACTICS,
});

describe("changeLines", () => {
  it("has no lines without changes", () => {
    expect(changeLines([], context())).toEqual([]);
  });

  it("writes a formation line for a formation change, in either language", () => {
    const edits = [{ time: 3720, minute: 62, formation: "4-3-3" as const }];

    expect(changeLines(edits, context())[0]?.text).toBe("Formation changed: 4-3-3");
    expect(changeLines(edits, context("sv"))[0]?.text).toBe("Formation ändrad: 4-3-3");
  });

  it("writes a substitution line at the time of the change, for the user's side", () => {
    const lines = changeLines(
      [{ time: 3720, minute: 62, substitutions: [{ off: "b", on: "l" }] }],
      context(),
    );
    expect(lines).toEqual([
      {
        time: 3720,
        kind: "change",
        team: "home",
        importance: "normal",
        text: "Substitution: Lindgren on for Berg",
      },
    ]);
  });

  it("writes one line for each of several substitutions", () => {
    const lines = changeLines(
      [
        {
          time: 4000,
          minute: 70,
          substitutions: [
            { off: "b", on: "l" },
            { off: "s", on: "x" },
          ],
        },
      ],
      context(),
    );
    expect(lines.map((l) => l.text)).toEqual([
      "Substitution: Lindgren on for Berg",
      "Substitution: x on for Svensson",
    ]);
  });

  it("names the tactic settings that changed since the last change", () => {
    const first = { ...NEUTRAL_TACTICS, pressing: "high", tempo: "fast" } as const;
    const second = { ...first, pressing: "low" } as const;
    const lines = changeLines(
      [
        { time: 100, minute: 1, tactics: first },
        { time: 200, minute: 3, tactics: second },
      ],
      context(),
    );
    expect(lines.map((l) => l.text)).toEqual([
      "Tactics changed: Pressing: High, Tempo: Fast",
      "Tactics changed: Pressing: Low",
    ]);
  });

  it("writes no line for a change that only brings the tactics up to date", () => {
    expect(changeLines([{ time: 5000, minute: 75 }], context())).toEqual([]);
    expect(changeLines([{ time: 5000, minute: 75, tactics: NEUTRAL_TACTICS }], context())).toEqual(
      [],
    );
  });

  it("writes a shout line", () => {
    const lines = changeLines([{ time: 3600, minute: 60, shout: "pushUp" }], context());
    expect(lines.map((l) => l.text)).toEqual(["Shout: Push up"]);
  });

  it("writes Swedish lines", () => {
    const [line] = changeLines(
      [{ time: 3720, minute: 62, substitutions: [{ off: "b", on: "l" }] }],
      context("sv"),
    );
    expect(line?.text).toBe("Byte: Lindgren in för Berg");
  });
});
