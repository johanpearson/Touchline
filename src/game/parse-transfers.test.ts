import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { parseCareer } from "./parse-career";

const copy = (): Record<string, unknown> => JSON.parse(JSON.stringify(aCareer()));

const errorOf = (raw: unknown): string | undefined => {
  const result = parseCareer(raw);
  return result.ok ? undefined : result.error;
};

const userPlayer = (c: Career) =>
  c.league.clubs.find((x) => x.id === c.userClubId)?.playerIds[0] as string;
const otherClub = (c: Career) => c.league.clubs.find((x) => x.id !== c.userClubId)?.id as string;

describe("parseCareer transfer window and offers", () => {
  it("reads a v7 save without window and offers as closed with no offers", () => {
    const raw = copy();
    delete raw.window;
    delete raw.offers;
    const result = parseCareer(raw);
    expect(result.ok && result.career.window).toBe("closed");
    expect(result.ok && result.career.offers).toEqual([]);
  });

  it("round-trips an open window with an offer", () => {
    const career = aCareer();
    const offer = { id: "o1", fromClubId: otherClub(career), playerId: userPlayer(career), fee: 9 };
    const raw = { ...copy(), window: "open", offers: [offer] };
    const result = parseCareer(raw);
    expect(result.ok && result.career.window).toBe("open");
    expect(result.ok && result.career.offers).toEqual([offer]);
  });

  it("rejects an unknown window value", () => {
    expect(errorOf({ ...copy(), window: "ajar" })).toBe("invalid-window");
  });

  it("rejects offers that are not usable", () => {
    const career = aCareer();
    const good = { id: "o1", fromClubId: otherClub(career), playerId: userPlayer(career), fee: 9 };
    const bad = [
      "x",
      [null],
      [{ ...good, fee: -1 }],
      [{ ...good, fee: 1.5 }],
      [{ ...good, id: 3 }],
      [{ ...good, fromClubId: "ghost" }],
      [{ ...good, fromClubId: career.userClubId }],
      [{ ...good, playerId: "ghost" }],
      [good, good],
    ];
    for (const offers of bad) expect(errorOf({ ...copy(), offers })).toBe("invalid-offers");
  });
});
