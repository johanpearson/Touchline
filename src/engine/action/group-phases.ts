import type { Side } from "../match-state";
import { opponentOf } from "../pitch";
import type { ActionEvent } from "./action-event";
import { holderAfter } from "./action-stats";
import type { PhaseOutcome, RawPhase } from "./phase";

const isLostTackle = (event: ActionEvent): boolean =>
  event.type === "tackle" && event.outcome === "lost";

/** The side whose possession `event` belongs to: a lost tackle belongs to the dribbler, not the tackler. */
const ownerOf = (event: ActionEvent): Side =>
  isLostTackle(event) ? opponentOf(event.team) : event.team;

const isOutOfPlay = (event: ActionEvent): boolean =>
  (event.type === "pass" || event.type === "carry" || event.type === "clearance") &&
  event.outcome === "outOfPlay";

const isFoul = (event: ActionEvent): boolean =>
  event.type === "foul" || (event.type === "tackle" && event.outcome === "foul");

const shotEnding = (event: ActionEvent): PhaseOutcome | undefined => {
  if (event.type !== "shot") return undefined;
  return event.outcome === "goal" ? "goal" : "shot";
};

/** How the possession ends right after `event`, or undefined when it goes on. */
const endingOf = (event: ActionEvent, team: Side): PhaseOutcome | undefined => {
  const shot = shotEnding(event);
  if (shot) return shot;
  if (isFoul(event)) return "foul";
  if (isOutOfPlay(event)) return "outOfPlay";
  return holderAfter(event) === team ? undefined : "turnover";
};

const continues = (open: RawPhase, event: ActionEvent): boolean =>
  event.type === "foul" || ownerOf(event) === open.team;

const joins = (open: RawPhase | undefined, event: ActionEvent): open is RawPhase =>
  open !== undefined && open.period === event.period && event.type !== "periodChange";

const lastKind = (event: ActionEvent): PhaseOutcome =>
  event.type === "setPiece" ? "setPiece" : "periodEnd";

const startPhase = (event: ActionEvent): RawPhase => ({
  team: ownerOf(event),
  period: event.period,
  indices: [],
  outcome: "periodEnd",
});

/** Adds `event` (log position `index`) to `phase` and returns how the possession ends there, if it does. */
const addAction = (
  phase: RawPhase,
  event: ActionEvent,
  index: number,
): PhaseOutcome | undefined => {
  phase.indices.push(index);
  const ending = event.type === "periodChange" ? undefined : endingOf(event, phase.team);
  phase.outcome = ending ?? lastKind(event);
  return ending;
};

/** The phase `event` belongs to: the open one while the same side keeps the ball in the same period, else a new one. */
const phaseFor = (open: RawPhase | undefined, event: ActionEvent, phases: RawPhase[]): RawPhase => {
  if (joins(open, event) && continues(open, event)) return open;
  if (joins(open, event)) open.outcome = "turnover";
  const started = startPhase(event);
  phases.push(started);
  return started;
};

/** Cuts the log into phases at every possession change, shot, foul, ball out of play and period change. */
export const groupActions = (events: readonly ActionEvent[]): RawPhase[] => {
  const phases: RawPhase[] = [];
  let open: RawPhase | undefined;
  events.forEach((event, index) => {
    const phase = phaseFor(open, event, phases);
    open = addAction(phase, event, index) ? undefined : phase;
  });
  return phases;
};
