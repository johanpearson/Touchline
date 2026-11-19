import type { Side } from "../match-state";
import { actInLoop } from "./act-in-loop";
import { changePeriod } from "./change-period";
import { restartEnergyClock } from "./energy-state";
import { HALF_SECONDS } from "./loop-constants";
import type { LoopContext, LoopState } from "./loop-state";
import { kickoffPlay } from "./play-action";

const otherSide = (side: Side): Side => (side === "home" ? "away" : "home");

/**
 * Starts the second half after half-time: a kickoff for the side that did not start the match, the
 * `periodChange` event, the end of the half (`secondHalfAdded` seconds of added time included) and the
 * first action. Throws an `Error` when the match is not at half-time.
 */
export const resumeLoop = (
  state: LoopState,
  firstKickoff: Side,
  secondHalfAdded: number,
  context: LoopContext,
): LoopState => {
  if (state.period !== "halfTime") throw new Error(`Cannot resume from ${state.period}`);
  const kickingOff = {
    ...state,
    energy: restartEnergyClock(state.energy, state.time),
    play: kickoffPlay(otherSide(firstKickoff), state.play.score, state.play.fouls),
  };
  const secondHalf = changePeriod(kickingOff, state.time, "secondHalf", context);
  return actInLoop(
    { ...secondHalf, periodEnd: state.time + HALF_SECONDS + secondHalfAdded },
    state.time,
    context,
  );
};
