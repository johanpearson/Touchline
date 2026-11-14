import type { Side } from "../match-state";
import { HOME_ADVANTAGE } from "./decision-constants";

/**
 * The success bonus of `side`: `HOME_ADVANTAGE` for the home side, 0 for the away side. `advantage`
 * can be overridden (tests and calibration); 0 gives a match without home advantage.
 */
export const homeEdge = (side: Side, advantage: number = HOME_ADVANTAGE): number =>
  side === "home" ? advantage : 0;
