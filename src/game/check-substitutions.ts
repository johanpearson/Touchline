import type { SubstitutionRecord } from "./live-squad";
import type { PlayerPosition } from "./squad-player";

/** Most substitutions in a match, however they are spread over the windows. */
export const MAX_SUBSTITUTIONS = 5;
/** Most substitution windows besides half-time. */
export const MAX_SUBSTITUTION_WINDOWS = 3;

export type SubstitutionError =
  | "too-many-substitutions"
  | "too-many-windows"
  | "duplicate-substitution"
  | "player-not-on-pitch"
  | "player-not-on-bench"
  | "position-mismatch";

const hasDuplicates = (ids: readonly string[]): boolean => new Set(ids).size !== ids.length;

const windowsOf = (substitutions: readonly SubstitutionRecord[]): number =>
  new Set(substitutions.filter((s) => !s.halfTime).map((s) => s.minute)).size;

export type SubstitutionCheck = {
  substitutions: readonly { off: string; on: string }[];
  minute: number;
  halfTime: boolean;
  changes: { substitutions: readonly SubstitutionRecord[] };
  onPitch: readonly string[];
  bench: readonly string[];
  position: (id: string) => PlayerPosition;
  samePosition: boolean;
};

const hasDuplicateSubstitution = (substitutions: SubstitutionCheck["substitutions"]): boolean =>
  hasDuplicates(substitutions.map((s) => s.off)) || hasDuplicates(substitutions.map((s) => s.on));

/** True when these substitutions need a new window and all three are used. */
const exceedsWindows = (c: SubstitutionCheck): boolean => {
  if (c.substitutions.length === 0 || c.halfTime) return false;
  const inWindow = c.changes.substitutions.some((s) => !s.halfTime && s.minute === c.minute);
  return !inWindow && windowsOf(c.changes.substitutions) >= MAX_SUBSTITUTION_WINDOWS;
};

const checkLimits = (c: SubstitutionCheck): SubstitutionError | undefined => {
  if (c.changes.substitutions.length + c.substitutions.length > MAX_SUBSTITUTIONS) {
    return "too-many-substitutions";
  }
  if (hasDuplicateSubstitution(c.substitutions)) return "duplicate-substitution";
  return exceedsWindows(c) ? "too-many-windows" : undefined;
};

export const checkSubstitutions = (c: SubstitutionCheck): SubstitutionError | undefined => {
  const limit = checkLimits(c);
  if (limit) return limit;
  for (const { off, on } of c.substitutions) {
    if (!c.onPitch.includes(off)) return "player-not-on-pitch";
    if (!c.bench.includes(on)) return "player-not-on-bench";
    if (c.samePosition && c.position(off) !== c.position(on)) return "position-mismatch";
  }
  return undefined;
};
