import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { acceptOffer } from "./accept-offer";
import { askingPrice, signingWage } from "./asking-price";
import { buyPlayer } from "./buy-player";
import type { Career } from "./career";
import { releasePlayer } from "./release-player";
import { signFreeAgent } from "./sign-free-agent";
import { inWindow, sumOfBalances, toFreeAgents, userClubOf } from "./transfer-test-helpers";

type Op = { kind: "buy" | "sign" | "release" | "accept"; pick: number; extra: number };

const start = (() => {
  const base = inWindow(3);
  const aiPlayers = base.league.clubs.filter((c) => c.id !== base.userClubId);
  const freed = aiPlayers.flatMap((c) => c.playerIds.slice(0, 2));
  return freed.reduce(toFreeAgents, base);
})();

const allPlayerIds = (c: Career) =>
  c.league.clubs.flatMap((club) => club.playerIds).concat(c.freeAgentIds);

const pickFrom = <T>(items: readonly T[], pick: number): T | undefined =>
  items.length === 0 ? undefined : items[pick % items.length];

const apply = (career: Career, op: Op): Career => {
  const aiIds = career.league.clubs
    .filter((c) => c.id !== career.userClubId)
    .flatMap((c) => c.playerIds);
  const mine = userClubOf(career).playerIds;
  const result = (() => {
    if (op.kind === "buy") {
      const id = pickFrom(aiIds, op.pick) ?? "";
      return buyPlayer(career, id, (askingPrice(career, id) ?? 0) + op.extra);
    }
    if (op.kind === "sign") {
      const id = pickFrom(career.freeAgentIds, op.pick) ?? "";
      return signFreeAgent(career, id, (signingWage(career, id) ?? 0) + op.extra);
    }
    const id = pickFrom(mine, op.pick) ?? "";
    if (op.kind === "release") return releasePlayer(career, id);
    const buyer = career.league.clubs.find((c) => c.id !== career.userClubId)?.id ?? "";
    const offer = { id: `o${op.pick}`, fromClubId: buyer, playerId: id, fee: op.extra };
    return acceptOffer({ ...career, offers: [offer] }, offer);
  })();
  return result.ok ? result.career : career;
};

const opArb: fc.Arbitrary<Op> = fc.record({
  kind: fc.constantFrom("buy", "sign", "release", "accept"),
  pick: fc.nat(1000),
  extra: fc.nat(500),
});

describe("transfer operations (property)", () => {
  it("never duplicate a player, keep every player placed once and conserve money", () => {
    fc.assert(
      fc.property(fc.array(opArb, { maxLength: 40 }), (ops) => {
        const total = allPlayerIds(start).length;
        const money = sumOfBalances(start);
        const end = ops.reduce(apply, start);
        const ids = allPlayerIds(end);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).toHaveLength(total);
        expect(sumOfBalances(end)).toBe(money);
        const mine = new Set(userClubOf(end).playerIds);
        const planned = [...end.squadPlan.starters, ...end.squadPlan.bench];
        expect(planned.every((id) => mine.has(id))).toBe(true);
      }),
      { numRuns: 60 },
    );
  });
});
