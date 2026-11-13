import { describe, expect, it } from "vitest";
import config from "../vite.config";

describe("vite config", () => {
  it("serves from the GitHub Pages repository path", () => {
    expect(config.base).toBe("/Touchline/");
  });
});
