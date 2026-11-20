import type { ActionEvent } from "./action-event";
import { MIN_PHASE_ACTIONS, type PhaseOutcome, type RawPhase } from "./phase";

const endsInShot = (phase: RawPhase): boolean =>
  phase.outcome === "goal" || phase.outcome === "shot";

const isMergeable = (log: readonly ActionEvent[], phase: RawPhase): boolean =>
  phase.indices.length < MIN_PHASE_ACTIONS &&
  !endsInShot(phase) &&
  phase.indices.every((i) => log[i]?.type !== "periodChange");

const sameSpell = (a: RawPhase, b: RawPhase): boolean => a.team === b.team && a.period === b.period;

/** A short phase between two phases of the same side: the ball was only briefly contested. */
const isSandwiched = (before: RawPhase, phase: RawPhase, after: RawPhase | undefined): boolean =>
  after !== undefined &&
  sameSpell(before, after) &&
  before.team !== phase.team &&
  before.period === phase.period;

type Merge = "keep" | "foldBack" | "foldBackKeepOutcome" | "foldForward";

/** A phase that ended in a shot or a goal ends there; nothing is added after it. */
const extendable = (previous: RawPhase | undefined): RawPhase | undefined =>
  previous && !endsInShot(previous) ? previous : undefined;

const foldBackKind = (
  previous: RawPhase | undefined,
  current: RawPhase,
  next: RawPhase | undefined,
): Merge => {
  if (!previous) return "keep";
  if (isSandwiched(previous, current, next)) return "foldBackKeepOutcome";
  return sameSpell(previous, current) ? "foldBack" : "keep";
};

const mergeKind = (
  log: readonly ActionEvent[],
  previous: RawPhase | undefined,
  current: RawPhase,
  next: RawPhase | undefined,
): Merge => {
  if (!isMergeable(log, current)) return "keep";
  const sandwichOrBack = foldBackKind(extendable(previous), current, next);
  if (sandwichOrBack === "foldBackKeepOutcome") return sandwichOrBack;
  return next && sameSpell(current, next) ? "foldForward" : sandwichOrBack;
};

const join = (first: RawPhase, second: RawPhase, outcome: PhaseOutcome): RawPhase => ({
  ...first,
  indices: [...first.indices, ...second.indices],
  outcome,
});

type Fold = { merged: RawPhase[]; carried?: RawPhase };

const fold = (
  log: readonly ActionEvent[],
  state: Fold,
  phase: RawPhase,
  next: RawPhase | undefined,
): Fold => {
  const current = state.carried ? join(state.carried, phase, phase.outcome) : phase;
  const previous = state.merged[state.merged.length - 1];
  const kind = mergeKind(log, previous, current, next);
  const rest = state.merged.slice(0, -1);
  switch (kind) {
    case "foldForward":
      return { merged: state.merged, carried: current };
    case "foldBackKeepOutcome":
      return {
        merged: [...rest, join(previous as RawPhase, current, (previous as RawPhase).outcome)],
      };
    case "foldBack":
      return { merged: [...rest, join(previous as RawPhase, current, current.outcome)] };
    default:
      return { merged: [...state.merged, current] };
  }
};

/**
 * Folds each short, quiet phase into a neighbour, so the count of phases stays in the range a person
 * can follow: into the earlier phase when the other side held the ball only briefly between two
 * spells of one side, otherwise into the next phase of the same side, else into the previous one.
 */
export const mergeShort = (log: readonly ActionEvent[], phases: readonly RawPhase[]): RawPhase[] =>
  phases.reduce<Fold>((state, phase, i) => fold(log, state, phase, phases[i + 1]), { merged: [] })
    .merged;
