import type { CommentaryLine } from "../../commentary";
import type { Side, TeamTactics } from "../../engine";
import type { MatchEdit, ShoutKind } from "../../game";
import type { MessageKey, Translator } from "../../i18n";

const TACTIC_NAMES = ["mentality", "pressing", "width", "tempo"] as const;

const SHOUT_LABELS: Record<ShoutKind, MessageKey> = {
  pushUp: "shout.pushUp",
  calmDown: "shout.calmDown",
  pressTheBall: "shout.pressTheBall",
  holdShape: "shout.holdShape",
};

/** What the lines are written with. */
export type ChangeLinesContext = {
  t: Translator["t"];
  /** Display name of every player, by id. */
  names: Readonly<Record<string, string>>;
  /** The side the user manages; the lines belong to it. */
  side: Side;
  /** The tactics the match was kicked off with; the first tactics change is read against them. */
  startTactics: TeamTactics;
};

/** "Mentality: Attacking, Tempo: Fast": the settings that differ from `before`. */
const tacticsChange = (
  t: ChangeLinesContext["t"],
  before: TeamTactics,
  after: TeamTactics,
): string =>
  TACTIC_NAMES.filter((name) => before[name] !== after[name])
    .map((name) =>
      t("feed.change.setting", {
        setting: t(`squad.tactic.${name}`),
        level: t(`squad.level.${after[name]}` as MessageKey),
      }),
    )
    .join(", ");

/**
 * The feed lines for the user's changes: one line per substitution, one when tactics changed, one for
 * a new formation and one for a shout, all at the engine time of the change. A change that only brings the tactics up to
 * date (the end of a shout) gives no line.
 */
export const changeLines = (
  edits: readonly MatchEdit[],
  { t, names, side, startTactics }: ChangeLinesContext,
): CommentaryLine[] => {
  const lines: CommentaryLine[] = [];
  let tactics = startTactics;
  const line = (time: number, text: string): number =>
    lines.push({ time, kind: "change", team: side, importance: "normal", text });
  for (const edit of edits) {
    for (const { off, on } of edit.substitutions ?? []) {
      line(
        edit.time,
        t("feed.change.substitution", { on: names[on] ?? on, off: names[off] ?? off }),
      );
    }
    if (edit.tactics) {
      const changed = tacticsChange(t, tactics, edit.tactics);
      tactics = edit.tactics;
      if (changed) line(edit.time, t("feed.change.tactics", { changes: changed }));
    }
    if (edit.formation) {
      line(edit.time, t("feed.change.formation", { formation: edit.formation }));
    }
    if (edit.shout) line(edit.time, t("feed.change.shout", { shout: t(SHOUT_LABELS[edit.shout]) }));
  }
  return lines;
};
