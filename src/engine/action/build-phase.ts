import type { Side } from "../match-state";
import { progressOf } from "../pitch";
import type { ActionEvent } from "./action-event";
import { APPROACH_DANGER, type Phase, type RawPhase } from "./phase";
import { PITCH_LENGTH } from "./pitch-metres";

/** A shot-less phase only counts as dangerous once the ball is this far (0..1) up the pitch. */
const APPROACH_FROM = 0.75;

const approachOf = (team: Side, events: readonly ActionEvent[]): number => {
  const furthest = Math.max(...events.map((e) => progressOf(team, e.to.x / PITCH_LENGTH)));
  return (APPROACH_DANGER * Math.max(0, furthest - APPROACH_FROM)) / (1 - APPROACH_FROM);
};

const dangerOf = (team: Side, events: readonly ActionEvent[]): number => {
  const xgs = events.flatMap((event) => (event.type === "shot" ? [event.xg] : []));
  return xgs.length > 0 ? Math.max(...xgs) : approachOf(team, events);
};

const territoryOf = (team: Side, first: ActionEvent, last: ActionEvent): number =>
  (team === "home" ? 1 : -1) * (last.to.x - first.from.x);

/** Computes the fields of a phase from the log positions it holds. */
export const buildPhase = (log: readonly ActionEvent[], raw: RawPhase): Phase => {
  const events = raw.indices.map((i) => log[i] as ActionEvent);
  const first = events[0] as ActionEvent;
  const last = events[events.length - 1] as ActionEvent;
  return {
    team: raw.team,
    period: raw.period,
    startTime: first.time,
    endTime: last.time,
    actions: raw.indices,
    outcome: raw.outcome,
    danger: dangerOf(raw.team, events),
    territory: territoryOf(raw.team, first, last),
    passes: events.filter((e) => e.type === "pass").length,
    path: [first.from, ...events.map((e) => e.to)],
  };
};
