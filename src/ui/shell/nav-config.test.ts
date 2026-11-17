import { describe, expect, it } from "vitest";
import { messages } from "../../i18n/messages";
import { hrefFor, parseRoute } from "../routes";
import {
  isNavCurrent,
  moreItems,
  NAV_ITEMS,
  navRoute,
  navTestId,
  phoneTabItems,
} from "./nav-config";

const CLUB = "kvarnby";

describe("nav config", () => {
  it("has unique ids", () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has an English and a Swedish label for every item", () => {
    for (const item of NAV_ITEMS) {
      expect(messages.en[item.labelKey]).toBeTruthy();
      expect(messages.sv[item.labelKey]).toBeTruthy();
    }
  });

  it("reaches every career route that has a screen of its own", () => {
    const reached = NAV_ITEMS.map((item) => navRoute(item, CLUB).name);
    expect(reached).toEqual(
      expect.arrayContaining(["home", "squad", "tactics", "match", "league", "club"]),
    );
    expect(reached).toContain("saves");
    expect(reached).toContain("settings");
  });

  it("links to routes that parse back to themselves", () => {
    for (const item of NAV_ITEMS) {
      const route = navRoute(item, CLUB);
      expect(parseRoute(hrefFor(route))).toEqual(route);
    }
  });

  it("links the club item to the user's own club", () => {
    const club = NAV_ITEMS.find((item) => item.id === "club");
    expect(club && navRoute(club, CLUB)).toEqual({ name: "club", clubId: CLUB });
  });

  it("puts Home, Squad, Match and League in the phone tab bar, in that order", () => {
    expect(phoneTabItems().map((item) => item.id)).toEqual(["hub", "squad", "match", "league"]);
  });

  it("lists every other item in the More drawer", () => {
    expect(moreItems().map((item) => item.id)).toEqual(["tactics", "club", "saves", "settings"]);
  });

  it("shows every item either as a phone tab or in More, never both", () => {
    const tabs = phoneTabItems().map((item) => item.id);
    const more = moreItems().map((item) => item.id);
    expect([...tabs, ...more].sort()).toEqual(NAV_ITEMS.map((item) => item.id).sort());
  });

  it("keeps the test ids the end-to-end specs rely on", () => {
    expect(NAV_ITEMS.map(navTestId).sort()).toEqual(
      [
        "nav-club",
        "nav-hub",
        "nav-league",
        "nav-match",
        "nav-saves",
        "nav-settings",
        "nav-squad",
        "nav-tactics",
      ].sort(),
    );
  });

  it("marks only the item of the current route as current", () => {
    const current = NAV_ITEMS.filter((item) => isNavCurrent(item, { name: "league" }, CLUB));
    expect(current.map((item) => item.id)).toEqual(["league"]);
  });

  it("marks the club item current only for the user's own club", () => {
    const club = NAV_ITEMS.find((item) => item.id === "club");
    if (!club) throw new Error("no club item");
    expect(isNavCurrent(club, { name: "club", clubId: CLUB }, CLUB)).toBe(true);
    expect(isNavCurrent(club, { name: "club", clubId: "other" }, CLUB)).toBe(false);
  });
});
