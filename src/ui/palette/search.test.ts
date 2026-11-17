import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  MAX_RESULTS_PER_GROUP,
  normalizeText,
  type SearchItem,
  searchPalette,
} from "./search";

const item = (group: SearchItem["group"], label: string, id = `${group}-${label}`): SearchItem => ({
  id,
  group,
  label,
});

const labelsOf = (results: ReturnType<typeof searchPalette>, group: SearchItem["group"]) =>
  results.find((r) => r.group === group)?.items.map((i) => i.label) ?? [];

describe("normalizeText", () => {
  it("lower-cases and removes diacritics", () => {
    expect(normalizeText("Västerås")).toBe("vasteras");
    expect(normalizeText("ÖSTERGÖTLAND")).toBe("ostergotland");
    expect(normalizeText("Åre")).toBe("are");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeText("  Kvarnby   IF ")).toBe("kvarnby if");
  });
});

describe("searchPalette", () => {
  const index = buildSearchIndex([
    item("clubs", "Kvarnby"),
    item("clubs", "Västerås"),
    item("clubs", "Norra Kvarn"),
    item("players", "Karl Andersson"),
    item("players", "Anders Berg"),
    item("players", "Sven Sandersson"),
  ]);

  it("finds a club by the start of its name", () => {
    expect(labelsOf(searchPalette(index, "kvarn"), "clubs")).toContain("Kvarnby");
  });

  it("matches Swedish letters with plain ones", () => {
    expect(labelsOf(searchPalette(index, "vasteras"), "clubs")).toEqual(["Västerås"]);
    expect(labelsOf(searchPalette(index, "VÄST"), "clubs")).toEqual(["Västerås"]);
  });

  it("ranks a name that starts with the query before a later word that does", () => {
    expect(labelsOf(searchPalette(index, "kvarn"), "clubs")).toEqual(["Kvarnby", "Norra Kvarn"]);
  });

  it("ranks players by the start of the name, then by the start of a later word", () => {
    expect(labelsOf(searchPalette(index, "and"), "players")).toEqual([
      "Anders Berg",
      "Karl Andersson",
    ]);
  });

  it("does not match the middle of a word", () => {
    expect(labelsOf(searchPalette(index, "ders"), "players")).toEqual([]);
  });

  it("needs every word of the query to start a word of the label", () => {
    expect(labelsOf(searchPalette(index, "karl and"), "players")).toEqual(["Karl Andersson"]);
    expect(labelsOf(searchPalette(index, "karl berg"), "players")).toEqual([]);
  });

  it("keeps the index order between equally ranked results", () => {
    const tied = buildSearchIndex([
      item("clubs", "Alfa Norr"),
      item("clubs", "Alfa Syd"),
      item("clubs", "Alfa Öst"),
    ]);
    expect(labelsOf(searchPalette(tied, "alfa"), "clubs")).toEqual([
      "Alfa Norr",
      "Alfa Syd",
      "Alfa Öst",
    ]);
  });

  it("returns no groups when nothing matches", () => {
    expect(searchPalette(index, "zzz")).toEqual([]);
  });

  it("lists groups in a fixed order and leaves empty groups out", () => {
    const mixed = buildSearchIndex([
      item("players", "Alex"),
      item("actions", "Alpha action"),
      item("clubs", "Alma"),
      item("screens", "Alerts"),
    ]);
    expect(searchPalette(mixed, "al").map((r) => r.group)).toEqual([
      "screens",
      "clubs",
      "players",
      "actions",
    ]);
  });

  it("shows only screens and actions for an empty query", () => {
    const mixed = buildSearchIndex([
      item("players", "Alex"),
      item("actions", "Play"),
      item("clubs", "Alma"),
      item("screens", "Home"),
    ]);
    expect(searchPalette(mixed, "  ").map((r) => r.group)).toEqual(["screens", "actions"]);
  });

  it("returns at most MAX_RESULTS_PER_GROUP results per group", () => {
    const many = buildSearchIndex(
      Array.from({ length: MAX_RESULTS_PER_GROUP + 5 }, (_, i) => item("players", `Player ${i}`)),
    );
    const results = searchPalette(many, "player");
    expect(labelsOf(results, "players")).toHaveLength(MAX_RESULTS_PER_GROUP);
    expect(MAX_RESULTS_PER_GROUP).toBe(8);
  });
});
