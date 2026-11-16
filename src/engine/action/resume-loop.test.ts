import { describe, expect, it } from "vitest";
import { advanceLoop } from "./advance-loop";
import { aLoopAtHalfTime, aStartedLoop } from "./loop-builders";
import { HALF_SECONDS } from "./loop-constants";
import { resumeLoop } from "./resume-loop";

describe("resumeLoop", () => {
  it("refuses to start anything but the second half, from half-time only", () => {
    const { state, context, firstKickoff, secondHalfAdded } = aStartedLoop();

    expect(() => resumeLoop(state, firstKickoff, secondHalfAdded, context)).toThrow(
      "Cannot resume from firstHalf",
    );
  });

  it("starts the second half with a periodChange and a kickoff for the side that did not start the match", () => {
    const { halfTime, context, firstKickoff, secondHalfAdded } = aLoopAtHalfTime(5, advanceLoop);
    const other = firstKickoff === "home" ? "away" : "home";
    const before = context.events.length;

    const resumed = resumeLoop(halfTime, firstKickoff, secondHalfAdded, context);

    const added = context.events.slice(before);
    expect(added[0]).toMatchObject({
      type: "periodChange",
      period: "secondHalf",
      time: halfTime.time,
      team: other,
    });
    expect(added[1]).toMatchObject({
      type: "setPiece",
      variant: "kickoff",
      team: other,
      time: halfTime.time,
    });
    expect(resumed.period).toBe("secondHalf");
  });

  it("ends the second half 45 minutes and the drawn added time after the restart", () => {
    const { halfTime, context, firstKickoff } = aLoopAtHalfTime(5, advanceLoop);

    const resumed = resumeLoop(halfTime, firstKickoff, 240, context);

    expect(resumed.periodEnd).toBe(halfTime.time + HALF_SECONDS + 240);
  });

  it("keeps the score and the fouls through the restart", () => {
    const { halfTime, context, firstKickoff, secondHalfAdded } = aLoopAtHalfTime(5, advanceLoop);

    const resumed = resumeLoop(halfTime, firstKickoff, secondHalfAdded, context);

    expect(resumed.play.score).toEqual(halfTime.play.score);
    expect(resumed.play.fouls).toEqual(halfTime.play.fouls);
  });

  it("schedules the next action after the restart action and does not change the state it was given", () => {
    const { halfTime, context, firstKickoff, secondHalfAdded } = aLoopAtHalfTime(5, advanceLoop);
    const before = { ...halfTime };

    const resumed = resumeLoop(halfTime, firstKickoff, secondHalfAdded, context);

    expect(resumed.nextActionAt).toBeGreaterThan(halfTime.time);
    expect(halfTime).toEqual(before);
  });
});
