import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

const NOW = "2026-03-10T12:00:00.000Z";
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("is just now within the first minute", () => {
    expect(relativeTime(ago(30_000), NOW, "en")).toEqual({ kind: "just-now" });
  });

  it("is just now for a time in the future", () => {
    expect(relativeTime(ago(-5 * MINUTE), NOW, "en")).toEqual({ kind: "just-now" });
  });

  it("is just now for a time that cannot be read", () => {
    expect(relativeTime("nonsense", NOW, "en")).toEqual({ kind: "just-now" });
  });

  it.each([
    [5 * MINUTE, "5 minutes ago", "för 5 minuter sedan"],
    [2 * HOUR, "2 hours ago", "för 2 timmar sedan"],
    [2 * HOUR + 59 * MINUTE, "2 hours ago", "för 2 timmar sedan"],
    [DAY, "yesterday", "i går"],
    [5 * DAY, "5 days ago", "för 5 dagar sedan"],
  ])("describes %i ms in both languages", (elapsed, en, sv) => {
    expect(relativeTime(ago(elapsed), NOW, "en")).toEqual({ kind: "ago", text: en });
    expect(relativeTime(ago(elapsed), NOW, "sv")).toEqual({ kind: "ago", text: sv });
  });

  it("counts exactly one minute as a minute", () => {
    expect(relativeTime(ago(MINUTE), NOW, "en")).toEqual({ kind: "ago", text: "1 minute ago" });
  });
});
