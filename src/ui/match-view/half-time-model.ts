import type { TeamTactics } from "../../engine";
import type { HalfTimeChanges, HalfTimePlan, Player, PlayerCondition } from "../../game";

/** What the half-time panel needs to let the user change their side. */
export type HalfTimeEditor = {
  /** The user's whole squad. */
  players: readonly Player[];
  starters: readonly string[];
  bench: readonly string[];
  condition: Readonly<Record<string, PlayerCondition>>;
  /** The tactics the match was started with. */
  tactics: TeamTactics;
  /** Validates the changes; see `planHalfTime`. */
  plan: (changes: HalfTimeChanges) => HalfTimePlan;
};

export type Substitution = { off: string; on: string };

export const sameTactics = (a: TeamTactics, b: TeamTactics): boolean =>
  a.mentality === b.mentality &&
  a.pressing === b.pressing &&
  a.width === b.width &&
  a.tempo === b.tempo;

export const playerOf = (editor: HalfTimeEditor, id: string): Player | undefined =>
  editor.players.find((p) => p.id === id);

/** Bench players who can replace `off`: the same position and not coming on in another change. */
export const replacementsFor = (
  editor: HalfTimeEditor,
  off: string,
  taken: readonly Substitution[],
): string[] => {
  const position = playerOf(editor, off)?.position;
  return editor.bench.filter(
    (id) => playerOf(editor, id)?.position === position && !taken.some((s) => s.on === id),
  );
};

/** Starters who can still go off: not in a pending change and with a replacement left. */
export const starterCanGoOff = (
  editor: HalfTimeEditor,
  id: string,
  taken: readonly Substitution[],
): boolean => !taken.some((s) => s.off === id) && replacementsFor(editor, id, taken).length > 0;
