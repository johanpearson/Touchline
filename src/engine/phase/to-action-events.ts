import type { ActionEvent } from "../action/action-event";
import type { MatchDetail } from "../action/action-match";
import { markKeyPasses } from "../action/mark-key-passes";
import type { Point } from "../action/pitch-metres";
import { buildSnapshot } from "../action/snapshot";
import { phaseOf } from "../action/team-phase";
import { teamShape } from "../action/team-shape";
import type { TeamSheet } from "../action/team-sheet";
import type { Side } from "../match-state";
import type { PerSide } from "../per-side";
import { createRng, type Rng } from "../rng";
import type { DraftEvent } from "./draft-event";
import type { PhaseStep } from "./phase-step";
import { draftsOf } from "./step-drafts";
import { spreadTimes } from "./step-times";

export type ToActionEventsOptions = {
  /** Both teams, for the positions of the 22 players in each snapshot. */
  sheets: PerSide<TeamSheet>;
  /** `"fast"` leaves out the snapshots (default `"full"`). */
  detail?: MatchDetail;
};

/** The presentation stream: it never feeds back into the steps. */
const INNER_STREAM = "inner-actions";
const MAX_PRESSURE = 0.6;

const shapesAt = (sheets: PerSide<TeamSheet>, step: PhaseStep, draft: DraftEvent, ball: Point) => {
  const last = {
    type: draft.type === "setPiece" ? ("setPiece" as const) : ("none" as const),
    actionsSinceTurnover: 99,
  };
  const shape = (side: Side) =>
    teamShape(sheets[side], sheets[side].tactics, phaseOf(side, step.team, ball, last), ball, side);
  return { home: shape("home"), away: shape("away") };
};

const withPresentation = (
  step: PhaseStep,
  drafts: readonly DraftEvent[],
  rng: Rng,
  options: ToActionEventsOptions,
): ActionEvent[] => {
  const whistled = drafts.at(-1)?.type === "periodChange";
  // The whistle sounds when the last action of a cut possession ends, so both share the step's end time.
  const times = whistled
    ? [...spreadTimes(drafts.length - 1, step.startTime, step.endTime, rng), step.endTime]
    : spreadTimes(drafts.length, step.startTime, step.endTime, rng);
  const pressures = drafts.map(() => Math.round(rng.next() * MAX_PRESSURE * 100) / 100);
  const snapshots = rng.fork("snapshots");
  return drafts.map((draft, i) => {
    const event = { ...draft, time: times[i], pressure: pressures[i] } as ActionEvent;
    if (options.detail === "fast") return event;
    const shapes = shapesAt(options.sheets, step, draft, draft.to);
    return { ...event, snapshot: buildSnapshot(shapes, draft.to, snapshots) };
  });
};

/**
 * The action events of one step: its restart, the passes along its chain, a carry here and there and
 * the closing action. `index` is the step's place in the match: it picks the step's own sub-stream of
 * the `"inner-actions"` fork of `seed`, so a step's actions never depend on the other steps and a
 * match loop can derive them one step at a time.
 */
export const toStepEvents = (
  step: PhaseStep,
  index: number,
  seed: number,
  options: ToActionEventsOptions,
): ActionEvent[] => {
  const rng = createRng(seed).fork(INNER_STREAM).fork(String(index));
  return markKeyPasses(withPresentation(step, draftsOf(step, rng), rng, options));
};

/**
 * Expands phase steps into the familiar action log (`docs/architecture.md`, "Engine v3"): passes
 * along each step's chain, a carry here and there, the restart that opens it and the action that
 * closes it (a shot for a chance, a lost carry or pass, a foul, a ball out of play or the period
 * change). All randomness comes from the `"inner-actions"` fork of `seed`, one sub-stream per step,
 * so a step's actions never depend on the others and nothing flows back into the steps.
 */
export const toActionEvents = (
  steps: readonly PhaseStep[],
  seed: number,
  options: ToActionEventsOptions,
): ActionEvent[] => steps.flatMap((step, i) => toStepEvents(step, i, seed, options));
