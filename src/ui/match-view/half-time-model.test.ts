import { describe, expect, it } from "vitest";
import { energyFactor } from "../../engine";
import {
  ATTRIBUTE_NAMES,
  attributesAtPosition,
  type Career,
  createCareer,
  EMPTY_MATCH_CHANGES,
  effectiveAttributes,
  effectiveRating,
  generateLeague,
  getNextFixture,
  overallIn,
  type PlayerAttributes,
} from "../../game";
import { changesSourceFor } from "../match-changes-source";
import { type ChangesEditor, editorAt, energyOf, positionOn, ratingAt } from "./half-time-model";

const aCareer = (): Career => {
  const league = generateLeague({ seed: 5 });
  const clubId = league.ok ? (league.league.clubs[0]?.id ?? "") : "";
  const created = createCareer({ seed: 5, userClubId: clubId });
  if (!created.ok) throw new Error("career");
  return created.career;
};

const career = aCareer();

const editorWith = (
  energy: Record<string, number>,
  fitness: Record<string, number> = {},
): ChangesEditor => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("fixture");
  const base = changesSourceFor(career, fixture)(EMPTY_MATCH_CHANGES);
  const condition = { ...base.condition };
  for (const [id, value] of Object.entries(fitness)) {
    condition[id] = { form: 5, ...condition[id], fitness: value };
  }
  return editorAt({ ...base, condition }, { minute: 45, halfTime: true, energy });
};

const benchId = (): string => {
  const id = career.squadPlan.bench[0];
  if (!id) throw new Error("bench");
  return id;
};

describe("energy and rating in the changes sheet", () => {
  it("shows a bench player as fully rested even when his condition fitness is below 100", () => {
    const id = benchId();
    expect(energyOf(editorWith({}, { [id]: 70 }), id)).toBe(100);
  });

  it("rates a bench player with the kickoff fitness acting through his attributes", () => {
    const id = benchId();
    const editor = editorWith({}, { [id]: 70 });
    const player = editor.players.find((p) => p.id === id);
    if (!player) throw new Error("player");
    const position = positionOn(editor, id);
    const condition = editor.condition[id] ?? { fitness: 100, form: 5 };
    expect(ratingAt(editor, id, position)).toBeCloseTo(
      effectiveRating(player, position, condition),
      10,
    );
  });

  it("rates a player who has played the way the lineups panel does: kickoff condition, then the engine's energy scaling", () => {
    const id = benchId();
    const editor = editorWith({ [id]: 60 }, { [id]: 70 });
    const player = editor.players.find((p) => p.id === id);
    if (!player) throw new Error("player");
    const position = positionOn(editor, id);
    const condition = editor.condition[id] ?? { fitness: 100, form: 5 };
    const kickoff = attributesAtPosition(
      effectiveAttributes(player, condition),
      player.position,
      position,
    );
    const factor = energyFactor(60);
    const expected = overallIn(
      position,
      Object.fromEntries(
        ATTRIBUTE_NAMES.map((name) => [name, kickoff[name] * factor]),
      ) as PlayerAttributes,
    );
    expect(energyOf(editor, id)).toBe(60);
    expect(ratingAt(editor, id, position)).toBeCloseTo(expected, 10);
    expect(expected).toBeLessThan(effectiveRating(player, position, condition));
  });
});
