import { describe, expect, it } from "vitest";
import { anEnginePlayer, aTeamSheet } from "./action-builders";
import { restartTaker } from "./restart-taker";

const sheet = aTeamSheet().build();
const shape = sheet.starters.map((_, i) => ({ x: 10 + i * 5, y: 34 }));

describe("restartTaker", () => {
  it("lets the goalkeeper take goal kicks", () => {
    expect(restartTaker("goalKick", sheet.starters, shape, { x: 5.5, y: 34 })).toBe(0);
  });

  it("lets the nearest outfield player take a throw-in", () => {
    expect(restartTaker("throwIn", sheet.starters, shape, { x: 41, y: 0 })).toBe(6);
  });

  it("lets the best finisher take a penalty", () => {
    const starters = sheet.starters.map((p, i) =>
      i === 9 ? anEnginePlayer(p.id).withPosition("FWD").withAttribute("finishing", 18).build() : p,
    );

    expect(restartTaker("penalty", starters, shape, { x: 94, y: 34 })).toBe(9);
  });

  it("lets the best passer take other restarts and the lowest slot wins a tie", () => {
    const starters = sheet.starters.map((p, i) =>
      i === 7 ? anEnginePlayer(p.id).withAttribute("passing", 16).build() : p,
    );

    expect(restartTaker("corner", starters, shape, { x: 105, y: 0 })).toBe(7);
    expect(restartTaker("kickoff", sheet.starters, shape, { x: 52.5, y: 34 })).toBe(1);
  });
});
