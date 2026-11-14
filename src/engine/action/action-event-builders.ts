import type {
  ActionEvent,
  CarryEvent,
  ClearanceEvent,
  FoulEvent,
  InterceptionEvent,
  PassEvent,
  SetPieceEvent,
  ShotEvent,
  TackleEvent,
} from "./action-event";
import type { Point } from "./pitch-metres";

const base = (time: number, team: "home" | "away", from: Point, to: Point) => ({
  time,
  period: "firstHalf" as const,
  team,
  from,
  to,
  pressure: 0,
  snapshot: { ball: to, players: [] },
});

type Common = { time?: number; from?: Point; to?: Point };
const at = (c: Common) => ({
  time: c.time ?? 1,
  from: c.from ?? { x: 50, y: 34 },
  to: c.to ?? { x: 55, y: 34 },
});

/** Compact event builders for tests of consumers of the action log. */
export const pass = (
  team: "home" | "away",
  actor: string,
  target: string,
  outcome: PassEvent["outcome"] = "complete",
  c: Common = {},
): PassEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "pass", variant: "short", actor, target, outcome };
};
export const carry = (
  team: "home" | "away",
  actor: string,
  outcome: CarryEvent["outcome"] = "kept",
  c: Common = {},
): CarryEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "carry", actor, outcome };
};
export const shot = (
  team: "home" | "away",
  actor: string,
  outcome: ShotEvent["outcome"],
  xg: number,
  keeper = "gk",
  c: Common = {},
): ShotEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "shot", actor, opponent: keeper, outcome, xg };
};
export const tackle = (
  team: "home" | "away",
  actor: string,
  outcome: TackleEvent["outcome"],
  c: Common = {},
): TackleEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "tackle", actor, outcome };
};
export const interception = (
  team: "home" | "away",
  actor: string,
  c: Common = {},
): InterceptionEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "interception", actor, outcome: "won" };
};
export const clearance = (team: "home" | "away", actor: string, c: Common = {}): ClearanceEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "clearance", actor, outcome: "kept" };
};
/** `team` is the fouled side; `offender` committed the foul. */
export const foul = (
  team: "home" | "away",
  actor: string,
  offender: string,
  c: Common = {},
): FoulEvent => {
  const { time, from, to } = at(c);
  return {
    ...base(time, team, from, to),
    type: "foul",
    actor,
    opponent: offender,
    outcome: "freeKick",
  };
};
export const setPiece = (
  team: "home" | "away",
  actor: string,
  variant: SetPieceEvent["variant"],
  c: Common = {},
): SetPieceEvent => {
  const { time, from, to } = at(c);
  return { ...base(time, team, from, to), type: "setPiece", actor, variant, outcome: "taken" };
};
export const periodChange = (
  time: number,
  period: "halfTime" | "fullTime" | "secondHalf",
): ActionEvent => ({
  ...base(time, "home", { x: 52.5, y: 34 }, { x: 52.5, y: 34 }),
  period,
  type: "periodChange",
});
