import type { FormationCounts } from "../engine";
import { FORMATION_SHAPE, type Formation } from "./formation";

/** The outfield line counts the action engine expects; the goalkeeper is implied. */
export const formationShape = (formation: Formation): FormationCounts => {
  const shape = FORMATION_SHAPE[formation];
  return { defenders: shape.DEF, midfielders: shape.MID, forwards: shape.FWD };
};
