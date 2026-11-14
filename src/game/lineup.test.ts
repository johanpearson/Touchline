import { describe, expect, it } from "vitest";
import { aFullSquad, aLineup } from "./game-builders";
import { validateLineup } from "./lineup";

const squad = aFullSquad(10);

describe("validateLineup", () => {
  it("accepts a valid lineup", () => {
    expect(validateLineup(aLineup().build(), squad)).toEqual({ ok: true });
  });

  it("rejects starters that do not match the formation shape", () => {
    const lineup = aLineup().withFormation("4-3-3").build();
    expect(validateLineup(lineup, squad)).toEqual({ ok: false, error: "wrong-formation-shape" });
  });

  it("rejects a lineup with fewer than eleven starters", () => {
    const base = aLineup().build();
    const lineup = { ...base, starters: base.starters.slice(1), bench: [...base.bench] };
    expect(validateLineup(lineup, squad)).toEqual({ ok: false, error: "wrong-formation-shape" });
  });

  it("rejects a bench that is not seven players", () => {
    const base = aLineup().build();
    const lineup = { ...base, bench: base.bench.slice(1) };
    expect(validateLineup(lineup, squad)).toEqual({ ok: false, error: "wrong-bench-size" });
  });

  it("rejects a bench without a goalkeeper", () => {
    const base = aLineup().build();
    const bench = base.bench.map((id) => (id === "p-GK-1" ? "p-MID-6" : id));
    expect(validateLineup({ ...base, bench }, squad)).toEqual({
      ok: false,
      error: "bench-without-keeper",
    });
  });

  it("rejects a player who appears twice", () => {
    const base = aLineup().build();
    const bench = [base.starters[1] as string, ...base.bench.slice(1)];
    expect(validateLineup({ ...base, bench }, squad)).toEqual({
      ok: false,
      error: "duplicate-player",
    });
  });

  it("rejects an id that is not in the squad", () => {
    const base = aLineup().build();
    const bench = ["ghost", ...base.bench.slice(1)];
    expect(validateLineup({ ...base, bench }, squad)).toEqual({
      ok: false,
      error: "unknown-player",
    });
  });
});
