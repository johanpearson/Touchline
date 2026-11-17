import { describe, expect, it } from "vitest";
import { createCareer, generateLeague } from "../../game";
import { createTranslator } from "../../i18n";
import { buildPaletteItems, type PaletteItem } from "./palette-items";

const careerFor = (seed = 5) => {
  const generated = generateLeague({ seed });
  if (!generated.ok) throw new Error("league");
  const club = generated.league.clubs[0];
  if (!club) throw new Error("club");
  const result = createCareer({ seed, userClubId: club.id });
  if (!result.ok) throw new Error("career");
  return result.career;
};

const build = (locale: "en" | "sv" = "en", theme = "midnight" as const) => {
  const career = careerFor();
  const translator = createTranslator(locale);
  return { career, items: buildPaletteItems({ career, translator, theme }) };
};

const ofGroup = (items: PaletteItem[], group: PaletteItem["group"]) =>
  items.filter((i) => i.group === group);

describe("buildPaletteItems", () => {
  it("lists every screen of the navigation config, labelled in the locale", () => {
    const en = ofGroup(build("en").items, "screens").map((i) => i.label);
    const sv = ofGroup(build("sv").items, "screens").map((i) => i.label);
    expect(en).toEqual([
      "Home",
      "Squad",
      "Tactics",
      "Next match",
      "League",
      "My club",
      "Saves",
      "Settings",
    ]);
    expect(sv).not.toEqual(en);
  });

  it("opens the user's club screen from the My club entry", () => {
    const { career, items } = build();
    const mine = ofGroup(items, "screens").find((i) => i.id === "screen-club");
    expect(mine?.target).toEqual({
      kind: "route",
      route: { name: "club", clubId: career.userClubId },
    });
  });

  it("lists every club with its crest colours and the club route", () => {
    const { career, items } = build();
    const clubs = ofGroup(items, "clubs");
    expect(clubs).toHaveLength(career.league.clubs.length);
    const first = career.league.clubs[0];
    expect(clubs[0]).toMatchObject({
      label: first?.name,
      crest: { shortName: first?.shortName, colours: first?.colours },
      target: { kind: "route", route: { name: "club", clubId: first?.id } },
    });
  });

  it("lists every league player and opens the club screen of the player's club", () => {
    const { career, items } = build();
    const players = ofGroup(items, "players");
    expect(players).toHaveLength(career.league.players.length);
    const club = career.league.clubs[2];
    const playerId = club?.playerIds[0];
    const player = career.league.players.find((p) => p.id === playerId);
    const entry = players.find((p) => p.id === `player-${playerId}`);
    expect(entry?.label).toBe(player?.name);
    expect(entry?.detail).toBe(`${player?.position}, ${club?.name}`);
    expect(entry?.target).toEqual({ kind: "route", route: { name: "club", clubId: club?.id } });
  });

  it("offers to play the next match while there is one", () => {
    const { items } = build();
    const play = ofGroup(items, "actions").find((i) => i.id === "action-play");
    expect(play).toMatchObject({
      label: "Play next match",
      target: { kind: "route", route: { name: "match" } },
    });
  });

  it("offers every other theme and language, but not the current ones", () => {
    const { items } = build("en", "midnight");
    const actions = ofGroup(items, "actions");
    expect(actions.filter((a) => a.target.kind === "theme").map((a) => a.target)).toEqual([
      { kind: "theme", theme: "graphite" },
      { kind: "theme", theme: "light" },
    ]);
    expect(actions.filter((a) => a.target.kind === "locale").map((a) => a.target)).toEqual([
      { kind: "locale", locale: "sv" },
    ]);
    expect(actions.map((a) => a.label)).toContain("Change theme to Graphite");
    expect(actions.map((a) => a.label)).toContain("Change language to Swedish");
  });
});
