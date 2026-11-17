import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { squadLimits } from "./squad-limits";

const base = aCareer(7);
const club = base.league.clubs[0] as { id: string; playerIds: string[] };

const without = (career: Career, ids: readonly string[]): Career => ({
  ...career,
  league: {
    ...career.league,
    clubs: career.league.clubs.map((c) =>
      c.id === club.id ? { ...c, playerIds: c.playerIds.filter((id) => !ids.includes(id)) } : c,
    ),
  },
});

const ofPosition = (position: string) =>
  club.playerIds.filter(
    (id) => base.league.players.find((p) => p.id === id)?.position === position,
  );

describe("squadLimits", () => {
  it("accepts a generated squad", () => {
    expect(squadLimits(base, club.id)).toEqual({
      missingTotal: 0,
      excessTotal: 0,
      missing: {},
      count: club.playerIds.length,
      ok: true,
    });
  });

  it("reports players missing below 18", () => {
    const keep = new Set(club.playerIds.slice(0, 17));
    const limits = squadLimits(
      without(
        base,
        club.playerIds.filter((id) => !keep.has(id)),
      ),
      club.id,
    );
    expect(limits.missingTotal).toBe(1);
    expect(limits.ok).toBe(false);
  });

  it("reports excess above 30", () => {
    const extra = base.league.players.filter((p) => !club.playerIds.includes(p.id)).slice(0, 9);
    const career: Career = {
      ...base,
      league: {
        ...base.league,
        clubs: base.league.clubs.map((c) =>
          c.id === club.id ? { ...c, playerIds: [...c.playerIds, ...extra.map((p) => p.id)] } : c,
        ),
      },
    };
    const limits = squadLimits(career, club.id);
    expect(limits.count).toBe(club.playerIds.length + 9);
    expect(limits.excessTotal).toBe(club.playerIds.length + 9 - 30);
    expect(limits.ok).toBe(false);
  });

  it("reports a missing position even when the squad is large enough", () => {
    const gks = ofPosition("GK");
    const limits = squadLimits(without(base, gks.slice(1)), club.id);
    expect(limits.missing).toEqual({ GK: 1 });
    expect(limits.ok).toBe(false);
  });

  it("treats exactly the minimums as fine", () => {
    const fwds = ofPosition("FWD");
    expect(squadLimits(without(base, fwds.slice(3)), club.id).missing).toEqual({});
  });

  it("gives an unknown club an empty, failing squad", () => {
    const limits = squadLimits(base, "nope");
    expect(limits.count).toBe(0);
    expect(limits.missingTotal).toBe(18);
    expect(limits.ok).toBe(false);
  });
});
