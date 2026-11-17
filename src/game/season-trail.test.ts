import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import { getNextFixture } from "./get-next-fixture";
import { extendTrail } from "./season-trail";
import { simulateFixture } from "./simulate-fixture";

const playOneMatchday = (career: ReturnType<typeof aCareer>) => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("season over");
  const outcome = completeMatchday(career, simulateFixture(career, fixture));
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.career;
};

describe("extendTrail", () => {
  it("keeps the career after each matchday, starting with the career itself", () => {
    const start = aCareer();

    const trail = extendTrail([start], 2);

    expect(trail).toHaveLength(3);
    expect(trail[0]).toBe(start);
    expect(trail.map((c) => c.season.currentMatchday)).toEqual([1, 2, 3]);
  });

  it("plays the same matchdays as completing them one by one", () => {
    const start = aCareer();

    const trail = extendTrail([start], 2);

    expect(trail[2]).toEqual(playOneMatchday(playOneMatchday(start)));
  });

  it("continues an existing trail without playing its matchdays again", () => {
    const trail = extendTrail([aCareer()], 1);
    const first = trail[1];

    const longer = extendTrail(trail, 2);

    expect(longer).toBe(trail);
    expect(longer).toHaveLength(3);
    expect(longer[1]).toBe(first);
  });

  it("does nothing when the trail is already long enough", () => {
    const trail = extendTrail([aCareer()], 2);

    expect(extendTrail(trail, 1)).toHaveLength(3);
  });
});
