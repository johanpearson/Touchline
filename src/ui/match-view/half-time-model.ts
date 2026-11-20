import type { TeamTactics } from "../../engine";
import {
  checkShout,
  effectiveRating,
  MAX_SUBSTITUTION_WINDOWS,
  MAX_SUBSTITUTIONS,
  type MatchChange,
  type MatchChanges,
  type PlanChangeError,
  type PlanChangeResult,
  type Player,
  type PlayerCondition,
  type PlayerPosition,
  type ShoutError,
  type ShoutKind,
} from "../../game";
import type { MessageKey } from "../../i18n";

/**
 * What the owner of the match knows about the user's side: who is on the pitch and on the bench now,
 * what has been changed already and how a request is validated (`planChange`). The match screen
 * adds the minute and the live energy to make a `ChangesEditor`.
 */
export type ChangesBase = {
  /** The user's whole squad. */
  players: readonly Player[];
  /** The eleven on the pitch now, in slot order. */
  starters: readonly string[];
  /** The bench players still available. */
  bench: readonly string[];
  condition: Readonly<Record<string, PlayerCondition>>;
  /** The position each substitute who came on plays; everyone else plays their own. */
  played: Readonly<Record<string, PlayerPosition>>;
  /** The base tactics in force (the saved plan's, or what the user last set). */
  tactics: TeamTactics;
  /** What has been changed so far; the rules count substitutions, windows and shouts from it. */
  changes: MatchChanges;
  /** Validates one request; see `planChange`. */
  plan: (change: MatchChange) => PlanChangeResult;
};

/** Gives the `ChangesBase` after the changes made so far (`EMPTY_MATCH_CHANGES` at kickoff). */
export type ChangesSource = (previous: MatchChanges) => ChangesBase;

/** What the changes sheet needs: the base plus the moment of the change and the live energy. */
export type ChangesEditor = Omit<ChangesBase, "plan"> & {
  /** Live energy (0 to 100) of everyone who has played; the condition's fitness for the rest. */
  energy: Readonly<Record<string, number>>;
  /** The match minute the change is made at (45 at half-time). */
  minute: number;
  halfTime: boolean;
  /** Validates a draft at `minute`; see `planChange`. */
  plan: (draft: ChangeDraft) => PlanChangeResult;
};

/** Makes the editor of one stoppage from the owner's base. */
export const editorAt = (
  base: ChangesBase,
  moment: { minute: number; halfTime: boolean; energy: ChangesEditor["energy"] },
): ChangesEditor => ({
  ...base,
  ...moment,
  plan: (draft) => base.plan(changeOf({ ...moment, tactics: base.tactics }, draft)),
});

export type Substitution = { off: string; on: string };

/** What the sheet has collected: substitutions in the order they were made, tactics and a shout. */
export type ChangeDraft = { subs: Substitution[]; tactics: TeamTactics; shout?: ShoutKind };

/** A change the rules accepted, with the request it came from (for the session and the feed). */
export type PlannedEditorChange = Extract<PlanChangeResult, { ok: true }> & {
  request: MatchChange;
};

export const sameTactics = (a: TeamTactics, b: TeamTactics): boolean =>
  a.mentality === b.mentality &&
  a.pressing === b.pressing &&
  a.width === b.width &&
  a.tempo === b.tempo;

/** The draft with nothing changed. */
export const freshDraft = (editor: ChangesEditor): ChangeDraft => ({
  subs: [],
  tactics: editor.tactics,
});

export const hasPending = (editor: ChangesEditor, draft: ChangeDraft): boolean =>
  draft.subs.length > 0 || draft.shout !== undefined || !sameTactics(draft.tactics, editor.tactics);

/** The request `planChange` takes for a draft at the editor's minute. */
export const changeOf = (
  editor: Pick<ChangesEditor, "minute" | "halfTime" | "tactics">,
  draft: ChangeDraft,
): MatchChange => ({
  minute: editor.minute,
  halfTime: editor.halfTime,
  substitutions: draft.subs,
  ...(sameTactics(draft.tactics, editor.tactics) ? {} : { tactics: draft.tactics }),
  ...(draft.shout ? { shout: draft.shout } : {}),
});

export const playerOf = (editor: ChangesEditor, id: string): Player | undefined =>
  editor.players.find((p) => p.id === id);

/** The position `id` plays now: the one he came on to play, or his own. */
export const positionOn = (editor: ChangesEditor, id: string): PlayerPosition =>
  editor.played[id] ?? playerOf(editor, id)?.position ?? "MID";

/** Energy shown for `id`: the live value if he has played, else the fitness he started with. */
export const energyOf = (editor: ChangesEditor, id: string): number =>
  Math.round(editor.energy[id] ?? editor.condition[id]?.fitness ?? 100);

/**
 * The rating (1 to 20) `id` has playing `position` at his current energy: the figure the engine
 * uses. Form comes from the condition.
 */
export const ratingAt = (editor: ChangesEditor, id: string, position: PlayerPosition): number => {
  const player = playerOf(editor, id);
  if (!player) return 0;
  const condition = editor.condition[id] ?? { fitness: 100, form: 5 };
  return effectiveRating(player, position, { ...condition, fitness: energyOf(editor, id) });
};

/** Bench players who can replace any pitch player: all of them except those in another pending change. */
export const replacementsFor = (editor: ChangesEditor, taken: readonly Substitution[]): string[] =>
  editor.bench.filter((id) => !taken.some((s) => s.on === id));

/** Starters who can still go off: not in a pending change and with a replacement left. */
export const starterCanGoOff = (
  editor: ChangesEditor,
  id: string,
  taken: readonly Substitution[],
): boolean => !taken.some((s) => s.off === id) && replacementsFor(editor, taken).length > 0;

/** Substitutions the user may still make, counting the pending ones. */
export const substitutionsLeft = (editor: ChangesEditor, pending: number): number =>
  Math.max(0, MAX_SUBSTITUTIONS - editor.changes.substitutions.length - pending);

/**
 * Substitution windows still free after this change: half-time and a minute that already has a
 * window cost none; a new minute costs one. The count excludes half-time.
 */
export const windowsLeft = (editor: ChangesEditor): number => {
  const used = new Set(
    editor.changes.substitutions.filter((s) => !s.halfTime).map((s) => s.minute),
  );
  return Math.max(0, MAX_SUBSTITUTION_WINDOWS - used.size);
};

/** Whether a new substitution would need a new window that is not there. */
export const noWindowLeft = (editor: ChangesEditor): boolean => {
  if (editor.halfTime) return false;
  const inThisMinute = editor.changes.substitutions.some(
    (s) => !s.halfTime && s.minute === editor.minute,
  );
  return !inThisMinute && windowsLeft(editor) === 0;
};

/** Why `kind` cannot be shouted now with the draft's tactics, or undefined when it can. */
export const shoutBlock = (
  editor: ChangesEditor,
  draft: ChangeDraft,
  kind: ShoutKind,
): ShoutError | undefined => checkShout(draft.tactics, editor.changes.shouts, kind, editor.minute);

export const ERROR_KEYS: Record<PlanChangeError, MessageKey> = {
  "too-many-substitutions": "changes.error.tooManySubstitutions",
  "too-many-windows": "changes.error.tooManyWindows",
  "player-not-on-pitch": "changes.error.playerNotOnPitch",
  "player-not-on-bench": "changes.error.playerNotOnBench",
  "position-mismatch": "changes.error.positionMismatch",
  "duplicate-substitution": "changes.error.duplicateSubstitution",
  "minute-out-of-range": "changes.error.minuteOutOfRange",
  "change-in-the-past": "changes.error.changeInThePast",
  "shout-active": "changes.error.shoutActive",
  "shout-cooling-down": "changes.error.shoutCoolingDown",
  "shout-no-effect": "changes.error.shoutNoEffect",
};
