import type { Mentality, Pressing, TeamTactics, Tempo } from "../engine";

/** The touchline shouts the user can give. */
export type ShoutKind = "pushUp" | "calmDown" | "pressTheBall" | "holdShape";

export const SHOUT_KINDS: readonly ShoutKind[] = [
  "pushUp",
  "calmDown",
  "pressTheBall",
  "holdShape",
];

/** A shout given at a match minute. */
export type ShoutRecord = { kind: ShoutKind; minute: number };

/** How long a shout changes the tactics, in match minutes. */
export const SHOUT_DURATION_MINUTES = 10;
/** Quiet time after a shout ends before the next one (of any kind) can be given. */
export const SHOUT_COOLDOWN_MINUTES = 10;
/**
 * Extra fitness a player loses per minute for every level the shout raises mentality or pressing
 * above the base tactics (a 90 minute match costs 10 fitness in all, see `FITNESS_DRAIN_PER_MATCH`).
 */
export const SHOUT_FATIGUE_PER_LEVEL_MINUTE = 0.05;

/** Steps each shout moves a tactic setting by (levels, positive is up); the other settings stay. */
type ShoutSteps = { mentality?: number; pressing?: number; tempo?: number };

export const SHOUT_STEPS: Record<ShoutKind, ShoutSteps> = {
  pushUp: { mentality: 1 },
  calmDown: { mentality: -1 },
  pressTheBall: { pressing: 1, tempo: 1 },
  holdShape: { pressing: -1, tempo: -1 },
};

const MENTALITY: readonly Mentality[] = ["defensive", "balanced", "attacking"];
const PRESSING: readonly Pressing[] = ["low", "medium", "high"];
const TEMPO: readonly Tempo[] = ["slow", "normal", "fast"];

const shifted = <T>(levels: readonly T[], value: T, steps = 0): T => {
  const index = Math.min(levels.length - 1, Math.max(0, levels.indexOf(value) + steps));
  return levels[index] as T;
};

/** The tactics while `kind` is active on top of `base`. Settings already at the end stay there. */
export const applyShout = (base: TeamTactics, kind: ShoutKind): TeamTactics => {
  const steps = SHOUT_STEPS[kind];
  return {
    ...base,
    mentality: shifted(MENTALITY, base.mentality, steps.mentality),
    pressing: shifted(PRESSING, base.pressing, steps.pressing),
    tempo: shifted(TEMPO, base.tempo, steps.tempo),
  };
};

const endOf = (shout: ShoutRecord): number => shout.minute + SHOUT_DURATION_MINUTES;

/** The shout in force at `minute` (from its minute up to, not including, its end), if any. */
export const activeShout = (
  shouts: readonly ShoutRecord[],
  minute: number,
): ShoutRecord | undefined => shouts.find((s) => minute >= s.minute && minute < endOf(s));

/** The tactics at `minute`: the base, with the active shout on top. */
export const tacticsAtMinute = (
  base: TeamTactics,
  shouts: readonly ShoutRecord[],
  minute: number,
): TeamTactics => {
  const active = activeShout(shouts, minute);
  return active ? applyShout(base, active.kind) : base;
};

export type ShoutError = "shout-active" | "shout-cooling-down" | "shout-no-effect";

/** Why `kind` cannot be given at `minute`, or `undefined` when it can. */
export const checkShout = (
  base: TeamTactics,
  shouts: readonly ShoutRecord[],
  kind: ShoutKind,
  minute: number,
): ShoutError | undefined => {
  if (activeShout(shouts, minute)) return "shout-active";
  const last = shouts[shouts.length - 1];
  if (last && minute < endOf(last) + SHOUT_COOLDOWN_MINUTES) return "shout-cooling-down";
  const after = applyShout(base, kind);
  const same = after.mentality === base.mentality && after.pressing === base.pressing;
  return same && after.tempo === base.tempo ? "shout-no-effect" : undefined;
};

const levelsUp = (levels: readonly string[], from: string, to: string): number =>
  Math.max(0, levels.indexOf(to) - levels.indexOf(from));

/** Fatigue points per minute while `kind` is on top of `base` (only higher mentality and pressing tire). */
export const shoutFatiguePerMinute = (
  base: TeamTactics,
  kind: ShoutKind,
  /** Count the pressing levels too (false: mentality only, because the engine's energy charges pressing). */
  includePressing = true,
): number => {
  const after = applyShout(base, kind);
  const levels =
    levelsUp(MENTALITY, base.mentality, after.mentality) +
    (includePressing ? levelsUp(PRESSING, base.pressing, after.pressing) : 0);
  return levels * SHOUT_FATIGUE_PER_LEVEL_MINUTE;
};

const overlap = (aFrom: number, aTo: number, bFrom: number, bTo: number): number =>
  Math.max(0, Math.min(aTo, bTo) - Math.max(aFrom, bFrom));

/** Extra fitness lost by a player on the pitch from minute `from` to `to` because of the shouts. */
export const shoutFatigue = (
  base: TeamTactics,
  shouts: readonly ShoutRecord[],
  from: number,
  to: number,
  includePressing = true,
): number =>
  shouts.reduce(
    (total, shout) =>
      total +
      overlap(from, to, shout.minute, endOf(shout)) *
        shoutFatiguePerMinute(base, shout.kind, includePressing),
    0,
  );
