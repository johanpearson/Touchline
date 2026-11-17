import { describe, expect, it } from "vitest";
import { formatMoney } from "./money-format";

describe("formatMoney", () => {
  it("writes millions with one decimal in English", () => {
    expect(formatMoney(1200, "en")).toBe("€1.2M");
    expect(formatMoney(25000, "en")).toBe("€25.0M");
  });

  it("writes millions with a decimal comma and the euro sign last in Swedish", () => {
    expect(formatMoney(1200, "sv")).toBe("1,2 M€");
  });

  it("writes amounts under a million in thousands", () => {
    expect(formatMoney(450, "en")).toBe("€450k");
    expect(formatMoney(450, "sv")).toBe("450 k€");
    expect(formatMoney(0, "en")).toBe("€0k");
  });

  it("groups large millions", () => {
    expect(formatMoney(1_234_500, "en")).toBe("€1,234.5M");
    expect(formatMoney(1_234_500, "sv").replace(/\s/g, " ")).toBe("1 234,5 M€");
  });

  it("puts a true minus sign before a negative amount", () => {
    expect(formatMoney(-1500, "en")).toBe("−€1.5M");
    expect(formatMoney(-1500, "sv")).toBe("−1,5 M€");
    expect(formatMoney(-300, "en")).toBe("−€300k");
  });
});
