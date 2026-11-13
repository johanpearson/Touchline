import { describe, expect, it } from "vitest";
import { aPlayer } from "./game-builders";
import { toSquadPlayer } from "./to-squad-player";

describe("toSquadPlayer", () => {
  it("keeps name and position and rescales finishing to 0..1", () => {
    const player = aPlayer().withName("Nils").withPosition("FWD").withFinishing(20).build();
    expect(toSquadPlayer(player)).toEqual({ name: "Nils", position: "FWD", finishing: 1 });
  });

  it("maps finishing 1 to 0", () => {
    expect(toSquadPlayer(aPlayer().withFinishing(1).build()).finishing).toBe(0);
  });
});
