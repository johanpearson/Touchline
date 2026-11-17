import { describe, expect, it } from "vitest";
import { backHref } from "./back-link";

describe("backHref", () => {
  it("returns to the page the user came from", () => {
    expect(backHref("#/club/kvarnby")).toBe("#/club/kvarnby");
    expect(backHref("#/league")).toBe("#/league");
  });

  it("falls back to the squad without a previous page", () => {
    expect(backHref(null)).toBe("#/squad");
    expect(backHref("")).toBe("#/squad");
  });

  it("falls back to the squad when the previous page is unknown or another profile", () => {
    expect(backHref("#/nowhere")).toBe("#/squad");
    expect(backHref("#/player/p-1")).toBe("#/squad");
  });
});
