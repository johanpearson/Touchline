import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventType } from "./match-event";

const at = { x: 0.5, y: 0.5 };
const base = { time: 60, team: "home", position: at, intensity: 0.5 } as const;

describe("MatchEvent", () => {
  it("covers every event type listed in the domain model", () => {
    const events: MatchEvent[] = [
      { ...base, type: "kickoff" },
      { ...base, type: "progress" },
      { ...base, type: "turnover" },
      { ...base, type: "shot", xg: 0.1, outcome: "saved" },
      { ...base, type: "goal", xg: 0.3 },
      { ...base, type: "corner" },
      { ...base, type: "foul" },
      { ...base, type: "periodChange", period: "halfTime" },
    ];

    const types: MatchEventType[] = events.map((event) => event.type);

    expect(new Set(types).size).toBe(8);
  });
});
