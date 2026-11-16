import { describe, expect, it } from "vitest";
import { widthModeFor } from "./width-mode";

describe("widthModeFor", () => {
  it("uses the sidebar from 1100 px", () => {
    expect(widthModeFor(1100)).toBe("sidebar");
    expect(widthModeFor(1440)).toBe("sidebar");
  });

  it("uses the icon rail from 640 to 1099 px", () => {
    expect(widthModeFor(1099)).toBe("rail");
    expect(widthModeFor(1024)).toBe("rail");
    expect(widthModeFor(640)).toBe("rail");
  });

  it("uses the bottom tab bar below 640 px", () => {
    expect(widthModeFor(639)).toBe("tabs");
    expect(widthModeFor(390)).toBe("tabs");
  });
});
