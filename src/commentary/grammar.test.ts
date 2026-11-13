import { describe, expect, it } from "vitest";
import { possessive } from "./grammar";

describe("possessive (Swedish)", () => {
  it.each([
    ["Kvarnby", "Kvarnbys"],
    ["Västerås", "Västerås"],
    ["Norrvik IF", "Norrvik IFs"],
    ["Västerå IS", "Västerå IS"],
    ["Alex", "Alex"],
  ])("turns %s into %s", (name, expected) => {
    expect(possessive("sv", name)).toBe(expected);
  });
});

describe("possessive (English)", () => {
  it.each([
    ["Kvarnby", "Kvarnby's"],
    ["Hearts", "Hearts'"],
  ])("turns %s into %s", (name, expected) => {
    expect(possessive("en", name)).toBe(expected);
  });
});
