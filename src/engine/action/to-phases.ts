import type { Period, Side } from "../match-state";
import { opponentOf, progressOf } from "../pitch";
import type { ActionEvent } from "./action-event";
import { holderAfter } from "./action-stats";
import { PITCH_LENGTH, type Point } from "./pitch-metres";

export type PhaseOutcome =
  | "goal"
  | "shot"
  | "turnover"
  | "foul"
  | "outOfPlay"
  | "setPiece"
  | "periodEnd";

/** One side's uninterrupted control of the ball: a passage of play with one outcome. */
export type Phase = {
  /** The side that had the ball at the phase's first action. */
  team: Side;
  period: Period;
  startTime: number;
  endTime: number;
  /** Indices into the action log, ascending and contiguous. */
  actions: readonly number[];
  outcome: PhaseOutcome;
  /** The highest xG of a shot in the phase; without a shot, a small value (at most `APPROACH_DANGER`) for how near the ball came to goal. */
  danger: number;
  /** Metres gained towards the goal the side attacks, from the first action's start to the last action's end. */
  territory: number;
  passes: number;
  /** Where the ball went: the first action's start, then the end of every action. */
  path: readonly Point[];
};

/** A phase without a shot shorter than this many actions is merged into its neighbour. */
export const MIN_PHASE_ACTIONS = 3;
/** The danger of a shot-less phase that reached the opponent's goal line. */
export const APPROACH_DANGER = 0.05;
/** A shot-less phase only counts as dangerous once the ball is this far (0..1) up the pitch. */
const APPROACH_FROM = 0.75;

type Raw = { team: Side; period: Period; indices: number[]; outcome: PhaseOutcome };

const isLostTackle = (event: ActionEvent): boolean =>
  event.type === "tackle" && event.outcome === "lost";

/** The side whose possession `event` belongs to: a lost tackle belongs to the dribbler, not the tackler. */
const ownerOf = (event: ActionEvent): Side =>
  isLostTackle(event) ? opponentOf(event.team) : event.team;

const isOutOfPlay = (event: ActionEvent): boolean =>
  (event.type === "pass" || event.type === "carry" || event.type === "clearance") &&
  event.outcome === "outOfPlay";

/** How the possession ends right after `event`, or undefined when it goes on. */
const endingOf = (event: ActionEvent, team: Side): PhaseOutcome | undefined => {
  if (event.type === "shot") return event.outcome === "goal" ? "goal" : "shot";
  if (event.type === "foul" || (event.type === "tackle" && event.outcome === "foul")) return "foul";
  if (isOutOfPlay(event)) return "outOfPlay";
  if (holderAfter(event) !== team) return "turnover";
  return undefined;
};

const joins = (open: Raw | undefined, event: ActionEvent): open is Raw => {
  if (!open || open.period !== event.period || event.type === "periodChange") return false;
  return event.type === "foul" || ownerOf(event) === open.team;
};

const lastKind = (event: ActionEvent | undefined): PhaseOutcome =>
  event?.type === "setPiece" ? "setPiece" : "periodEnd";

const groupActions = (events: readonly ActionEvent[]): Raw[] => {
  const phases: Raw[] = [];
  let open: Raw | undefined;
  events.forEach((event, index) => {
    const target = joins(open, event)
      ? open
      : { team: ownerOf(event), period: event.period, indices: [], outcome: "periodEnd" as const };
    if (target !== open) {
      if (open && open.period === event.period) open.outcome = "turnover";
      phases.push(target);
    }
    target.indices.push(index);
    const ending = event.type === "periodChange" ? undefined : endingOf(event, target.team);
    target.outcome = ending ?? lastKind(event);
    open = ending ? undefined : target;
  });
  return phases;
};

const shotXgs = (events: readonly ActionEvent[]): number[] =>
  events.flatMap((event) => (event.type === "shot" ? [event.xg] : []));

const approachOf = (team: Side, events: readonly ActionEvent[]): number => {
  const furthest = Math.max(...events.map((e) => progressOf(team, e.to.x / PITCH_LENGTH)));
  return (APPROACH_DANGER * Math.max(0, furthest - APPROACH_FROM)) / (1 - APPROACH_FROM);
};

const dangerOf = (team: Side, events: readonly ActionEvent[]): number => {
  const xgs = shotXgs(events);
  return xgs.length > 0 ? Math.max(...xgs) : approachOf(team, events);
};

const territoryOf = (team: Side, first: ActionEvent, last: ActionEvent): number =>
  (team === "home" ? 1 : -1) * (last.to.x - first.from.x);

const buildPhase = (log: readonly ActionEvent[], raw: Raw): Phase => {
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

const isMergeable = (log: readonly ActionEvent[], raw: Raw): boolean =>
  raw.indices.length < MIN_PHASE_ACTIONS &&
  raw.outcome !== "goal" &&
  raw.outcome !== "shot" &&
  raw.indices.every((i) => log[i]?.type !== "periodChange");

const sameSpell = (a: Raw, b: Raw): boolean => a.team === b.team && a.period === b.period;

/** A short phase between two phases of the same side: the ball was only briefly contested. */
const isSandwiched = (before: Raw | undefined, phase: Raw, after: Raw | undefined): boolean =>
  before !== undefined &&
  after !== undefined &&
  sameSpell(before, after) &&
  before.team !== phase.team &&
  before.period === phase.period;

/**
 * Folds each short, quiet phase into a neighbour, so the count of phases stays in the range a person
 * can follow: into the phases around it when the other side held the ball only briefly between two
 * spells of one side, otherwise into the next phase of the same side, else into the previous one.
 */
const mergeShort = (log: readonly ActionEvent[], phases: readonly Raw[]): Raw[] => {
  const merged: Raw[] = [];
  let carried: Raw | undefined;
  phases.forEach((phase, index) => {
    const current: Raw = carried
      ? { ...phase, indices: [...carried.indices, ...phase.indices] }
      : phase;
    carried = undefined;
    const previous = merged[merged.length - 1];
    const next = phases[index + 1];
    if (!isMergeable(log, current)) {
      merged.push(current);
    } else if (previous && isSandwiched(previous, current, next)) {
      merged[merged.length - 1] = {
        ...previous,
        indices: [...previous.indices, ...current.indices],
      };
    } else if (next && sameSpell(current, next)) {
      carried = current;
    } else if (previous && sameSpell(previous, current)) {
      merged[merged.length - 1] = {
        ...previous,
        indices: [...previous.indices, ...current.indices],
        outcome: current.outcome,
      };
    } else {
      merged.push(current);
    }
  });
  return merged;
};

/**
 * Groups an action log into possession phases (`docs/engine-pacing.md`): one side's uninterrupted
 * control of the ball, from winning it until it loses it, shoots, is fouled or knocks it out of
 * play, or the period ends. Every action belongs to exactly one phase, in order, and a phase never
 * crosses a period. A period change is a phase of its own. A short phase without a shot (fewer
 * than `MIN_PHASE_ACTIONS` actions) is merged into the next phase of the same side, or else the
 * previous one. Pure and without random draws: it reads the log and nothing else.
 */
export const toPhases = (events: readonly ActionEvent[]): Phase[] =>
  mergeShort(events, groupActions(events)).map((raw) => buildPhase(events, raw));
