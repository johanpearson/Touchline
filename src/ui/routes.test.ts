import { describe, expect, it } from "vitest";
import { hrefFor, parseRoute } from "./routes";

describe("parseRoute", () => {
  it("treats an empty hash as the home route", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
  });

  it("parses the plain routes", () => {
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/league")).toEqual({ name: "league" });
    expect(parseRoute("#/match")).toEqual({ name: "match" });
    expect(parseRoute("#/season-end")).toEqual({ name: "season-end" });
  });

  it("parses a club route with its id", () => {
    expect(parseRoute("#/club/kvarnby")).toEqual({ name: "club", clubId: "kvarnby" });
  });

  it("decodes the club id", () => {
    expect(parseRoute("#/club/a%20b")).toEqual({ name: "club", clubId: "a b" });
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
      { name: "match" },
      { name: "season-end" },
      { name: "club", clubId: "a b" },
    ] as const) {
      expect(parseRoute(hrefFor(route))).toEqual(route);
    }
  });
});
