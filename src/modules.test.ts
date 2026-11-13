import { describe, expect, it } from "vitest";

const modules = import.meta.glob("./{shared,engine,game,commentary,i18n,platform,ui}/index.ts");

describe("module layout", () => {
  it.each(["shared", "engine", "game", "commentary", "i18n", "platform", "ui"])(
    "has a public index.ts for %s",
    (name) => {
      expect(Object.keys(modules)).toContain(`./${name}/index.ts`);
    },
  );

  it("has a public index.ts for the match view", () => {
    const matchView = import.meta.glob("./ui/match-view/index.ts");
    expect(Object.keys(matchView)).toHaveLength(1);
  });
});
