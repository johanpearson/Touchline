import type { Side } from "../match-state";
import type { SetPieceVariant } from "./action-event";
import type { EnginePlayer } from "./engine-player";
import type { Point } from "./pitch-metres";

/** Who has the ball next. `slot` is the index in the side's starters; absent when a dead-ball taker is chosen later. */
export type Possession = { side: Side; slot?: number };

/** A player together with where the shape puts them. */
export type Challenger = { slot: number; player: EnginePlayer; point: Point };

/** A dead-ball restart that follows an out-of-play ball or a foul. */
export type Restart = {
  team: Side;
  variant: Extract<SetPieceVariant, "throwIn" | "goalKick" | "corner" | "freeKick" | "penalty">;
  position: Point;
};

/** What an open-play resolver returns: the outcome, where the ball ends up and who has it. */
export type Resolution<Outcome extends string> = {
  outcome: Outcome;
  ball: Point;
  possession: Possession;
  /** Set when the ball is dead and the restart is taken before play goes on. */
  restart?: Restart;
};
