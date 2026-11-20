import { describe, expect, it } from "vitest";
import type { ZoneEvent } from "../../engine";
import { formatMatchMinute, matchMinuteOf } from "./match-minute";

const halfTime = (time: number): ZoneEvent => ({
  type: "periodChange",
  period: "halfTime",
  time,
  team: "home",
  position: { x: 0.5, y: 0.5 },
  intensity: 0,
});

describe("formatMatchMinute", () => {
  it("shows the running minute in the first half", () => {
    expect(formatMatchMinute(12 * 60 + 30, [])).toBe("12’");
  });

  it("shows minute 0 before a full minute has passed", () => {
    expect(formatMatchMinute(20, [])).toBe("0’");
  });

  it("shows 45 up to the end of the regular first half", () => {
    expect(formatMatchMinute(2700, [])).toBe("45’");
  });

  it("shows added time after 45 minutes in the first half", () => {
    expect(formatMatchMinute(2700 + 2 * 60 + 5, [])).toBe("45+2’");
  });

  it("continues from 45 in the second half, however long the first half was added to", () => {
    const events = [halfTime(2700 + 180)];
    expect(formatMatchMinute(2880, events)).toBe("45’");
    expect(formatMatchMinute(2880 + 10 * 60, events)).toBe("55’");
  });

  it("shows added time after 90 minutes in the second half", () => {
    const events = [halfTime(2880)];
    expect(formatMatchMinute(2880 + 45 * 60 + 3 * 60, events)).toBe("90+3’");
  });

  it("shows the end of the first half as 45+n while the match is paused at half-time", () => {
    const events = [halfTime(2880)];
    expect(formatMatchMinute(2880, events)).toBe("45’");
  });
});

describe("matchMinuteOf", () => {
  it("counts whole minutes in the first half and stops at 45 in its added time", () => {
    expect(matchMinuteOf(12 * 60 + 59, [])).toBe(12);
    expect(matchMinuteOf(2700 + 150, [])).toBe(45);
  });

  it("counts on from 45 in the second half, whatever the added time of the first", () => {
    const events = [halfTime(2880)];
    expect(matchMinuteOf(2880, events)).toBe(45);
    expect(matchMinuteOf(2880 + 17 * 60 + 10, events)).toBe(62);
  });

  it("keeps counting past 90 in the added time of the second half", () => {
    expect(matchMinuteOf(2880 + 47 * 60, [halfTime(2880)])).toBe(92);
  });
});
