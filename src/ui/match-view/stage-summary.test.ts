import { describe, expect, it } from "vitest";
import type { ZoneEvent } from "../../engine";
import { attackingSide, describeStage } from "./stage-summary";

const shot = (team: "home" | "away", time: number, intensity = 0.8): ZoneEvent =>
  ({ type: "shot", team, time, intensity, position: { x: 0.8, y: 0.5 } }) as ZoneEvent;

describe("attackingSide", () => {
  it("is undefined before anything dangerous happened", () => {
    expect(attackingSide([], 600)).toBeUndefined();
  });

  it("is the side with more recent danger", () => {
    expect(attackingSide([shot("home", 500), shot("away", 100)], 600)).toBe("home");
    expect(attackingSide([shot("away", 500), shot("home", 100)], 600)).toBe("away");
  });

  it("is undefined when the recent danger is level", () => {
    expect(attackingSide([shot("home", 500), shot("away", 510)], 600)).toBeUndefined();
  });

  it("ignores danger older than the last bucket", () => {
    expect(attackingSide([shot("home", 10, 5)], 1200)).toBeUndefined();
  });
});

describe("describeStage", () => {
  const t = (key: string, params: Record<string, string | number> = {}) =>
    `${key}:${Object.values(params).join(",")}`;
  const names = { home: "Kvarnby", away: "Västerås" };

  it("gives the score and the attacking team", () => {
    const text = describeStage({ t, names, score: { home: 1, away: 0 }, attacking: "away" });
    expect(text).toBe("match.summary.score:Kvarnby,1,Västerås,0. match.summary.attack:Västerås.");
  });

  it("says play is even when nobody attacks", () => {
    const text = describeStage({ t, names, score: { home: 0, away: 0 }, attacking: undefined });
    expect(text).toContain("match.summary.attack.even");
  });
});
