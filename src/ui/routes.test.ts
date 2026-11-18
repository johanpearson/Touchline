import { describe, expect, it } from "vitest";
import { hrefFor, parentOf, parseRoute, type Route } from "./routes";

describe("parseRoute", () => {
  it("treats an empty hash as the home route", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
  });

  it("parses the plain routes", () => {
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/league")).toEqual({ name: "league" });
    expect(parseRoute("#/match")).toEqual({ name: "match" });
    expect(parseRoute("#/season-end")).toEqual({ name: "season-end" });
    expect(parseRoute("#/off-season")).toEqual({ name: "off-season" });
    expect(parseRoute("#/results")).toEqual({ name: "results" });
    expect(parseRoute("#/saves")).toEqual({ name: "saves" });
    expect(parseRoute("#/settings")).toEqual({ name: "settings" });
    expect(parseRoute("#/squad")).toEqual({ name: "squad" });
    expect(parseRoute("#/tactics")).toEqual({ name: "tactics" });
    expect(parseRoute("#/market")).toEqual({ name: "market" });
    expect(parseRoute("#/new")).toEqual({ name: "new" });
  });

  it("parses the club step of the new-career wizard", () => {
    expect(parseRoute("#/new/club")).toEqual({ name: "new-club" });
  });

  it("returns not-found for unknown wizard steps", () => {
    expect(parseRoute("#/new/league")).toEqual({ name: "not-found" });
  });

  it("parses a club route with its id", () => {
    expect(parseRoute("#/club/kvarnby")).toEqual({ name: "club", clubId: "kvarnby" });
  });

  it("decodes the club id", () => {
    expect(parseRoute("#/club/a%20b")).toEqual({ name: "club", clubId: "a b" });
  });

  it("parses a player route with its id", () => {
    expect(parseRoute("#/player/p-12")).toEqual({ name: "player", playerId: "p-12" });
    expect(parseRoute("#/player/a%20b")).toEqual({ name: "player", playerId: "a b" });
  });

  it("returns not-found for a player route without a usable id", () => {
    expect(parseRoute("#/player")).toEqual({ name: "not-found" });
    expect(parseRoute("#/player/%E0%A4%A")).toEqual({ name: "not-found" });
    expect(parseRoute("#/player/a/b")).toEqual({ name: "not-found" });
  });

  it("returns not-found for unknown routes", () => {
    expect(parseRoute("#/nowhere")).toEqual({ name: "not-found" });
    expect(parseRoute("#/club")).toEqual({ name: "not-found" });
    expect(parseRoute("#/league/extra")).toEqual({ name: "not-found" });
  });

  it("returns not-found for a malformed club id", () => {
    expect(parseRoute("#/club/%E0%A4%A")).toEqual({ name: "not-found" });
  });
});

describe("hrefFor", () => {
  it("builds hash links that parse back to the same route", () => {
    for (const route of [
      { name: "home" },
      { name: "league" },
      { name: "saves" },
      { name: "settings" },
      { name: "squad" },
      { name: "tactics" },
      { name: "market" },
      { name: "new" },
      { name: "new-club" },
      { name: "match" },
      { name: "season-end" },
      { name: "off-season" },
      { name: "club", clubId: "a b" },
      { name: "player", playerId: "a b" },
    ] as const) {
      expect(parseRoute(hrefFor(route))).toEqual(route);
    }
  });
});

const ALL_ROUTES: readonly Route[] = [
  { name: "home" },
  { name: "league" },
  { name: "club", clubId: "kvarnby" },
  { name: "player", playerId: "p-1" },
  { name: "match" },
  { name: "results" },
  { name: "season-end" },
  { name: "off-season" },
  { name: "saves" },
  { name: "settings" },
  { name: "squad" },
  { name: "tactics" },
  { name: "market" },
  { name: "new" },
  { name: "new-club" },
  { name: "not-found" },
];

describe("parentOf", () => {
  it("has no parent for the root", () => {
    expect(parentOf({ name: "home" })).toBeNull();
  });

  it.each([
    "squad",
    "tactics",
    "league",
    "market",
    "saves",
    "settings",
    "results",
    "off-season",
    "season-end",
    "match",
    "new",
    "not-found",
  ] as const)("makes home the parent of %s", (name) => {
    expect(parentOf({ name })).toEqual({ name: "home" });
  });

  it("makes home the parent of a club page", () => {
    expect(parentOf({ name: "club", clubId: "kvarnby" })).toEqual({ name: "home" });
  });

  it("makes the new-career screen the parent of the club step", () => {
    expect(parentOf({ name: "new-club" })).toEqual({ name: "new" });
  });

  it("makes the squad the parent of a player without a referrer", () => {
    expect(parentOf({ name: "player", playerId: "p-1" })).toEqual({ name: "squad" });
    expect(parentOf({ name: "player", playerId: "p-1" }, null)).toEqual({ name: "squad" });
  });

  it("sends a player back to the club or the market it was opened from", () => {
    const player: Route = { name: "player", playerId: "p-1" };
    expect(parentOf(player, { name: "club", clubId: "kvarnby" })).toEqual({
      name: "club",
      clubId: "kvarnby",
    });
    expect(parentOf(player, { name: "market" })).toEqual({ name: "market" });
    expect(parentOf(player, { name: "tactics" })).toEqual({ name: "tactics" });
  });

  it("ignores a referrer that is another player, unknown or not a profile source", () => {
    const player: Route = { name: "player", playerId: "p-1" };
    expect(parentOf(player, { name: "player", playerId: "p-2" })).toEqual({ name: "squad" });
    expect(parentOf(player, { name: "not-found" })).toEqual({ name: "squad" });
    expect(parentOf(player, { name: "settings" })).toEqual({ name: "squad" });
  });

  it("ignores a referrer for every route except the player", () => {
    expect(parentOf({ name: "tactics" }, { name: "market" })).toEqual({ name: "home" });
  });

  it("reaches the root from every route in a bounded number of steps", () => {
    for (const route of ALL_ROUTES) {
      let current: Route | null = route;
      let steps = 0;
      while (current && current.name !== "home") {
        current = parentOf(current);
        steps += 1;
        expect(steps).toBeLessThanOrEqual(4);
      }
      expect(current?.name ?? "home").toBe("home");
    }
  });
});
