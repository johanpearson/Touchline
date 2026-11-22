import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { ChanceCue, chanceCueKey } from "./chance-cue";
import type { SegmentChance } from "./director";

const players = { s9: "Dahl", k1: "Ek" };
const teamNames = { home: "Kvarnby", away: "Västerås" };
const colours = { home: "#f00", away: "#00f" };
const moment = (over: Partial<SegmentChance> = {}): SegmentChance => ({
  stage: "shot",
  result: "saved",
  team: "home",
  shooter: "s9",
  keeper: "k1",
  ...over,
});

const show = (m: SegmentChance | undefined, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <ChanceCue moment={m} teamNames={teamNames} colours={colours} players={players} />
    </I18nProvider>,
  );

describe("ChanceCue", () => {
  afterEach(cleanup);

  it("shows nothing outside a chance but keeps its live region", () => {
    show(undefined);
    expect(screen.queryByTestId("chance-cue")).toBeNull();
    expect(screen.getByTestId("chance-cue-region").getAttribute("aria-live")).toBe("polite");
  });

  it("names the side while the chance builds and the taker at the shot", () => {
    show(moment({ stage: "creator" }));
    expect(screen.getByTestId("chance-cue").textContent).toBe("Chance for Kvarnby");
    cleanup();
    show(moment({ stage: "shot" }));
    expect(screen.getByTestId("chance-cue").textContent).toBe("Dahl shoots");
  });

  it("tells each result differently: the keeper on a save, the taker on a miss", () => {
    const text = (result: SegmentChance["result"]) => {
      show(moment({ stage: "reaction", result }));
      const value = screen.getByTestId("chance-cue").textContent;
      cleanup();
      return value;
    };
    expect(text("goal")).toBe("Goal! Dahl scores");
    expect(text("saved")).toBe("Saved! Ek keeps it out");
    expect(text("wide")).toBe("Wide! Dahl misses the target");
    const all = (["goal", "saved", "woodwork", "blocked", "wide", "over"] as const).map(text);
    expect(new Set(all).size).toBe(6);
  });

  it("speaks Swedish", () => {
    show(moment({ stage: "reaction", result: "goal" }), "sv");
    expect(screen.getByTestId("chance-cue").textContent).toBe("Mål! Dahl gör mål");
  });

  it("marks the stage and result for styling and tests", () => {
    show(moment({ stage: "reaction", result: "woodwork" }));
    const cue = screen.getByTestId("chance-cue");
    expect(cue.getAttribute("data-stage")).toBe("reaction");
    expect(cue.getAttribute("data-result")).toBe("woodwork");
  });

  it("maps the stages of a chance to the keys of the build-up, shot and reaction", () => {
    expect(chanceCueKey(moment({ stage: "tension" }))).toBe("match.chance.shot");
    expect(chanceCueKey(moment({ stage: "creator" }))).toBe("match.chance.building");
  });
});
