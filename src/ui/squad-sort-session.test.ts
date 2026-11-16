import { afterEach, describe, expect, it } from "vitest";
import { loadSquadSort, saveSquadSort } from "./squad-sort-session";

const VALID = new Set(["name", "overall"]);

afterEach(() => window.sessionStorage.clear());

describe("squad sort session", () => {
  it("returns null when nothing was saved", () => {
    expect(loadSquadSort(VALID)).toBeNull();
  });

  it("gives back what was saved", () => {
    saveSquadSort({ id: "overall", direction: "desc" });
    expect(loadSquadSort(VALID)).toEqual({ id: "overall", direction: "desc" });
  });

  it("ignores unknown columns, bad directions and broken JSON", () => {
    saveSquadSort({ id: "gone", direction: "asc" });
    expect(loadSquadSort(VALID)).toBeNull();
    window.sessionStorage.setItem("touchline.squad.sort", '{"id":"name","direction":"up"}');
    expect(loadSquadSort(VALID)).toBeNull();
    window.sessionStorage.setItem("touchline.squad.sort", "{nope");
    expect(loadSquadSort(VALID)).toBeNull();
    window.sessionStorage.setItem("touchline.squad.sort", "5");
    expect(loadSquadSort(VALID)).toBeNull();
  });
});
