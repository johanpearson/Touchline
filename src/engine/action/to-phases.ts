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

const joins = (open: Raw | undefined, event: ActionEvent): boolean => {
  if (!open || open.period !== event.period || event.type === "periodChange") return false;
  return event.type === "foul" || ownerOf(event) === open.team;
};

const lastKind = (event: ActionEvent | undefined): PhaseOutcome =>
  event?.type === "setPiece" ? "setPiece" : "periodEnd";

const startPhase = (event: ActionEvent): Raw => ({
  team: ownerOf(event),
  period: event.period,
  indices: [],
  outcome: "periodEnd",
});

/** Adds `event` (log position `index`) to `phase` and returns how the possession ends there, if it does. */
const addAction = (phase: Raw, event: ActionEvent, index: number): PhaseOutcome | undefined => {
  phase.indices.push(index);
  const ending = event.type === "periodChange" ? undefined : endingOf(event, phase.team);
  phase.outcome = ending ?? lastKind(event);
  return ending;
};

const groupActions = (events: readonly ActionEvent[]): Raw[] => {
  const phases: Raw[] = [];
  let open: Raw | undefined;
  events.forEach((event, index) => {
    if (!joins(open, event)) {
      if (open && open.period === event.period) open.outcome = "turnover";
      open = startPhase(event);
      phases.push(open);
    }
    if (addAction(open as Raw, event, index)) open = undefined;
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

/** A phase that ended in a shot or a goal ends there; nothing is added after it. */
const isExtendable = (raw: Raw): boolean => raw.outcome !== "goal" && raw.outcome !== "shot";

const sameSpell = (a: Raw, b: Raw): boolean => a.team === b.team && a.period === b.period;

/** A short phase between two phases of the same side: the ball was only briefly contested. */
const isSandwiched = (before: Raw | undefined, phase: Raw, after: Raw | undefined): boolean =>
  before !== undefined &&
  after !== undefined &&
  sameSpell(before, after) &&
  before.team !== phase.team &&
  before.period === phase.period;

type Merge = "keep" | "foldBack" | "foldBackKeepOutcome" | "foldForward";

const mergeKind = (
  log: readonly ActionEvent[],
  previous: Raw | undefined,
  current: Raw,
  next: Raw | undefined,
): Merge => {
  if (!isMergeable(log, current)) return "keep";
  const extendable = previous && isExtendable(previous) ? previous : undefined;
  if (extendable && isSandwiched(extendable, current, next)) return "foldBackKeepOutcome";
  if (next && sameSpell(current, next)) return "foldForward";
  if (extendable && sameSpell(extendable, current)) return "foldBack";
  return "keep";
};

const join = (first: Raw, second: Raw, outcome: PhaseOutcome): Raw => ({
  ...first,
  indices: [...first.indices, ...second.indices],
  outcome,
});

/**
 * Folds each short, quiet phase into a neighbour, so the count of phases stays in the range a person
 * can follow: into the earlier phase when the other side held the ball only briefly between two
 * spells of one side, otherwise into the next phase of the same side, else into the previous one.
 */
const mergeShort = (log: readonly ActionEvent[], phases: readonly Raw[]): Raw[] => {
  const merged: Raw[] = [];
  let carried: Raw | undefined;
  phases.forEach((phase, index) => {
    const current = carried ? join(carried, phase, phase.outcome) : phase;
    const previous = merged[merged.length - 1];
    const kind = mergeKind(log, previous, current, phases[index + 1]);
    carried = kind === "foldForward" ? current : undefined;
    if (previous && kind === "foldBackKeepOutcome")
      merged.splice(-1, 1, join(previous, current, previous.outcome));
    if (previous && kind === "foldBack")
      merged.splice(-1, 1, join(previous, current, current.outcome));
    if (kind === "keep") merged.push(current);
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
