import type { Point } from "../action/pitch-metres";

/** How the chance came about. */
export type ChanceKind =
  | "openPlay"
  | "throughBall"
  | "cross"
  | "cutBack"
  | "counter"
  | "setPiece"
  | "freeKick"
  | "penalty";

/** What the shooter faced. A penalty counts as `oneOnOne` and a direct free kick as `edge`. */
export type ChanceSituation = "oneOnOne" | "header" | "edge" | "box" | "volley";

/** The shot's result. `wide` and `over` are near misses; `woodwork` hit the frame. */
export type ChanceResult = "goal" | "saved" | "woodwork" | "blocked" | "wide" | "over";

/** How play restarts after the chance. */
export type ChanceAftermath = "rebound" | "corner" | "goalKick" | "kickoff";

/** A first-class chance: a story with a creator, a shooter, a situation and a result. */
export type Chance = {
  kind: ChanceKind;
  /** Player id of the last passer; the shooter is the last player of the step's chain. */
  creator: string;
  shooter: string;
  situation: ChanceSituation;
  /** Expected goals of the shot, 0..1. */
  xg: number;
  result: ChanceResult;
  /** Player id of the goalkeeper who faced the shot. */
  keeper: string;
  aftermath: ChanceAftermath;
  /** Where the shot was taken, in metres. */
  from: Point;
};
