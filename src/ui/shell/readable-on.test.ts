import { describe, expect, it } from "vitest";
import { readableOn } from "./readable-on";

describe("readableOn", () => {
  it("picks light text on a dark colour", () => {
    expect(readableOn("#102a5c")).toBe(readableOn("#000000"));
    expect(readableOn("#000000")).toBe("#ffffff");
  });

  it("picks dark text on a light colour", () => {
    expect(readableOn("#ffffff")).not.toBe("#ffffff");
    expect(readableOn("#f2e94e")).not.toBe("#ffffff");
  });

  it("falls back to light text for a colour it cannot read", () => {
    expect(readableOn("not-a-colour")).toBe("#ffffff");
  });
});
