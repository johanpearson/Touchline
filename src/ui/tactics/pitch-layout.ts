import { FORMATION_SHAPE, type Formation, type PlayerPosition } from "../../game";

export const LINE_ORDER: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

export type SlotRole =
  | "goalkeeper"
  | "leftBack"
  | "leftCentreBack"
  | "centreBack"
  | "rightCentreBack"
  | "rightBack"
  | "leftMidfielder"
  | "leftCentralMidfielder"
  | "centralMidfielder"
  | "rightCentralMidfielder"
  | "rightMidfielder"
  | "leftForward"
  | "centreForward"
  | "rightForward"
  | "striker";

/** A starting slot: its line, its role (named left to right) and where it sits on the pitch (percent, 0 to 100). */
export type PitchSlot = { line: PlayerPosition; role: SlotRole; x: number; y: number };

/** Roles of a line, left to right, by the number of players in it. */
const ROLES: Record<PlayerPosition, Record<number, readonly SlotRole[]>> = {
  GK: { 1: ["goalkeeper"] },
  DEF: {
    3: ["leftCentreBack", "centreBack", "rightCentreBack"],
    4: ["leftBack", "leftCentreBack", "rightCentreBack", "rightBack"],
    5: ["leftBack", "leftCentreBack", "centreBack", "rightCentreBack", "rightBack"],
  },
  MID: {
    3: ["leftMidfielder", "centralMidfielder", "rightMidfielder"],
    4: ["leftMidfielder", "leftCentralMidfielder", "rightCentralMidfielder", "rightMidfielder"],
    5: [
      "leftMidfielder",
      "leftCentralMidfielder",
      "centralMidfielder",
      "rightCentralMidfielder",
      "rightMidfielder",
    ],
  },
  FWD: {
    1: ["striker"],
    2: ["leftForward", "rightForward"],
    3: ["leftForward", "centreForward", "rightForward"],
  },
};

/** Height of each line: the goalkeeper at the bottom, attack at the top. */
const LINE_Y: Record<PlayerPosition, number> = { GK: 88, DEF: 68, MID: 44, FWD: 19 };

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** The eleven slots of a formation in plan order (goalkeeper, defence, midfield, attack), with pitch coordinates. */
export const pitchSlots = (formation: Formation): PitchSlot[] =>
  LINE_ORDER.flatMap((line) => {
    const count = FORMATION_SHAPE[formation][line];
    const roles = ROLES[line][count] ?? [];
    return roles.map((role, index) => ({
      line,
      role,
      x: round1(((index + 1) / (count + 1)) * 100),
      y: LINE_Y[line],
    }));
  });
