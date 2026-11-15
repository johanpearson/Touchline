import { describe, expect, it } from "vitest";
import { aMatchInput, anEnginePlayer } from "./action-builders";
import { applyChangeToInput } from "./apply-change-to-input";

describe("applyChangeToInput", () => {
  it("moves a substitute from the bench into the starting eleven", () => {
    const input = aMatchInput().build();
    const sub = anEnginePlayer("h-b1").withPosition("MID").build();
    const lineup = input.home.starters.map((p, i) => (i === 5 ? sub : p));

    const result = applyChangeToInput(input, { side: "home", lineup });

    expect(result.ok && result.input.home.starters[5]).toEqual(sub);
    expect(result.ok && result.input.home.bench).toEqual([]);
    expect(result.ok && result.input.away).toBe(input.away);
  });

  it("does not mutate the input and keeps unchanged parts", () => {
    const input = aMatchInput().build();
    const tactics = { ...input.home.tactics, pressing: "high" } as const;

    const result = applyChangeToInput(input, { side: "home", tactics });

    expect(input.home.tactics).not.toEqual(tactics);
    expect(result.ok && result.input.home.tactics).toEqual(tactics);
    expect(result.ok && result.input.home.starters).toBe(input.home.starters);
  });
});

describe("applyChangeToInput lineups and tactics", () => {
  const base = aMatchInput().build();
  const input = {
    ...base,
    home: {
      ...base.home,
      bench: [...base.home.bench, anEnginePlayer("h-b2").withPosition("DEF").build()],
    },
  };
  const ids = (players: readonly { id: string }[]) => players.map((p) => p.id);

  it("takes the substitute off the bench and leaves the rest of the bench in order", () => {
    const sub = input.home.bench[0];
    const lineup = input.home.starters.map((p, i) => (i === 5 ? (sub ?? p) : p));
    const result = applyChangeToInput(input, { side: "home", lineup });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(ids(result.input.home.starters)).toEqual(ids(lineup));
    expect(ids(result.input.home.bench)).toEqual(ids(input.home.bench.slice(1)));
  });

  it("rejects a lineup that uses a player of the other side, for either side", () => {
    const intruder = (side: "home" | "away") => {
      const own = input[side];
      const foe = input[side === "home" ? "away" : "home"];
      const lineup = own.starters.map((p, i) =>
        i === 5 ? { ...p, id: foe.starters[5]?.id ?? "x" } : p,
      );
      return applyChangeToInput(input, { side, lineup });
    };
    for (const side of ["home", "away"] as const) {
      const result = intruder(side);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.map((e) => e.code)).toContain("duplicateId");
    }
  });

  it("rejects an invalid lineup and leaves the input as it was", () => {
    const result = applyChangeToInput(input, {
      side: "home",
      lineup: input.home.starters.slice(1),
    });
    expect(result.ok).toBe(false);
    expect(input.home.starters).toHaveLength(11);
  });

  it("changes only tactics when no lineup is given: same starters and bench", () => {
    const tactics = { ...input.away.tactics, tempo: "fast" } as const;
    const result = applyChangeToInput(input, { side: "away", tactics });
    expect(result.ok && result.input.away.starters).toBe(input.away.starters);
    expect(result.ok && ids(result.input.away.bench)).toEqual(ids(input.away.bench));
    expect(result.ok && result.input.away.tactics).toEqual(tactics);
    expect(result.ok && result.input.home).toBe(input.home);
  });

  it("keeps the old tactics when a change only brings a new lineup", () => {
    const sub = input.away.bench[0];
    const lineup = input.away.starters.map((p, i) => (i === 5 ? (sub ?? p) : p));
    const result = applyChangeToInput(input, { side: "away", lineup });
    expect(result.ok && result.input.away.tactics).toBe(input.away.tactics);
  });
});
