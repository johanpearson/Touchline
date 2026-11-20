import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import { getNextFixture } from "./get-next-fixture";
import { planChange } from "./plan-change";
import { simulateFixture } from "./simulate-fixture";

describe("a substitution at minute 62", () => {
  const career = aCareer(7);
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("fixture");
  const off = career.squadPlan.starters[1] as string;
  const stays = career.squadPlan.starters[2] as string;
  const [on, unused] = career.squadPlan.bench as [string, string];

  const planned = planChange(career, fixture, {
    minute: 62,
    substitutions: [{ off, on }],
  });
  if (!planned.ok) throw new Error(planned.error);
  const outcome = completeMatchday(career, simulateFixture(career, fixture), planned.report);
  if (!outcome.ok) throw new Error(outcome.error);
  const next = outcome.career;

  it("reaches the season minutes of the players", () => {
    expect(next.minutes[off]).toBe(62);
    expect(next.minutes[on]).toBe(28);
    expect(next.minutes[stays]).toBe(90);
    expect(next.minutes[unused] ?? 0).toBe(0);
  });

  it("reaches the condition: the less a player played the less tired he is", () => {
    const fitness = (id: string) => next.condition[id]?.fitness ?? 0;
    expect(fitness(off)).toBeGreaterThan(fitness(stays));
    expect(fitness(on)).toBeLessThan(fitness(unused));
  });
});
