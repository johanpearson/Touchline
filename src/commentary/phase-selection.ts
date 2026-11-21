import type { ActionEvent, Phase } from "../engine";
import { toPhases } from "../engine";
import { DANGEROUS_PHASE_DANGER } from "./action-selection";

const isStop = (event: ActionEvent | undefined): event is ActionEvent =>
  event !== undefined && (event.type === "tackle" || event.type === "interception");

/** The action that ends a phase in a shot or a goal: the shot itself, known as soon as it is played. */
const shotKey = (phase: Phase): number | undefined =>
  phase.outcome === "goal" || phase.outcome === "shot" ? phase.actions.at(-1) : undefined;

/** The foul that ends a phase. */
const foulKey = (phase: Phase, events: readonly ActionEvent[]): number | undefined => {
  const last = phase.actions.at(-1);
  return phase.outcome === "foul" && last !== undefined && events[last]?.type === "foul"
    ? last
    : undefined;
};

/** The tackle or interception that ended a phase which had come close to goal. */
const stopKey = (phase: Phase, next: Phase, events: readonly ActionEvent[]): number | undefined => {
  const first = next.actions[0];
  const dangerous = phase.outcome === "turnover" && phase.danger >= DANGEROUS_PHASE_DANGER;
  return dangerous && first !== undefined && isStop(events[first]) ? first : undefined;
};

const keyOf = (
  phase: Phase,
  next: Phase | undefined,
  events: readonly ActionEvent[],
): number | undefined => {
  const shot = shotKey(phase);
  if (shot !== undefined || next === undefined) return shot;
  return foulKey(phase, events) ?? stopKey(phase, next, events);
};

/**
 * Which actions of the log carry the commentary of a possession phase (`toPhases`): the shot or goal
 * that ends a phase, the foul that ends one, and the tackle or interception that stops a dangerous
 * attack, plus every penalty award (a one-action phase that is merged away would lose it). A quiet
 * phase has none, so a passage of play gets at most one line. Pure and without random
 * draws. The last phase is open: only a shot is final then, because grouping and merging short phases
 * can still change the others when more of the match is played, so earlier lines never change.
 */
export const selectKeyActions = (events: readonly ActionEvent[]): ReadonlySet<number> => {
  const phases = toPhases(events);
  const keys = phases.map((phase, i) => keyOf(phase, phases[i + 1], events));
  const penalties = events.flatMap((e, i) =>
    e.type === "foul" && e.outcome === "penalty" ? [i] : [],
  );
  return new Set([...penalties, ...keys.filter((key): key is number => key !== undefined)]);
};
