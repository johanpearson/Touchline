import { describe, expect, it } from "vitest";
import { MAX_SQUAD_SIZE } from "../../game";
import { messages } from "../../i18n/messages";
import { careerInWindow } from "../test-career";
import {
  buyBlockedReason,
  DEFAULT_SEASONS,
  marketSummary,
  parseWholeNumber,
  signBlockedReason,
  TRANSFER_ERRORS,
  transferErrorKey,
} from "./market-status";

const open = careerInWindow();
const user = open.league.clubs.find((c) => c.id === open.userClubId);
const full = {
  ...open,
  league: {
    ...open.league,
    clubs: open.league.clubs.map((c) =>
      c.id === open.userClubId
        ? {
            ...c,
            playerIds: [
              ...c.playerIds,
              ...open.league.players.map((p) => p.id).filter((id) => !c.playerIds.includes(id)),
            ].slice(0, MAX_SQUAD_SIZE),
          }
        : c,
    ),
  },
};

describe("transferErrorKey", () => {
  it("has an English and a Swedish message for every transfer error", () => {
    for (const error of TRANSFER_ERRORS) {
      const key = transferErrorKey(error);
      expect(messages.en[key]).toBeTruthy();
      expect(messages.sv[key]).toBeTruthy();
    }
  });
});

describe("blocked reasons", () => {
  it("lets the user buy while the window is open and the squad has room", () => {
    expect(buyBlockedReason(open)).toBeNull();
    expect(signBlockedReason(open)).toBeNull();
  });

  it("blocks buying but not signing free agents while the window is closed", () => {
    const closed = { ...open, window: "closed" as const };
    expect(buyBlockedReason(closed)).toBe("window-closed");
    expect(signBlockedReason(closed)).toBeNull();
  });

  it("blocks buying and signing when the squad is full", () => {
    expect(full.league.clubs.find((c) => c.id === full.userClubId)?.playerIds).toHaveLength(
      MAX_SQUAD_SIZE,
    );
    expect(buyBlockedReason(full)).toBe("squad-full");
    expect(signBlockedReason(full)).toBe("squad-full");
  });

  it("names the closed window before a full squad", () => {
    expect(buyBlockedReason({ ...full, window: "closed" })).toBe("window-closed");
  });
});

describe("marketSummary", () => {
  it("reports balance, wage bill, wage budget and squad count", () => {
    const summary = marketSummary(open);
    expect(summary.squadCount).toBe(user?.playerIds.length);
    expect(summary.squadMax).toBe(MAX_SQUAD_SIZE);
    expect(summary.balance).toBe(open.finances[open.userClubId]?.balance);
    expect(summary.wageBill).toBeGreaterThan(0);
    expect(summary.wageBudget).toBeGreaterThan(0);
  });
});

describe("parseWholeNumber", () => {
  it("reads whole numbers and gives NaN for anything else, so the game refuses it", () => {
    expect(parseWholeNumber("1200")).toBe(1200);
    expect(parseWholeNumber(" 15 ")).toBe(15);
    expect(parseWholeNumber("")).toBeNaN();
    expect(parseWholeNumber("12.5")).toBeNaN();
    expect(parseWholeNumber("abc")).toBeNaN();
  });
});

describe("DEFAULT_SEASONS", () => {
  it("is the game's default contract length", () => {
    expect(DEFAULT_SEASONS).toBe(3);
  });
});
