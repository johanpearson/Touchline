import { useState } from "react";
import type { MatchState, MatchStats, TeamTactics } from "../../engine";
import {
  type HalfTimeChanges,
  type HalfTimeError,
  type HalfTimePlan,
  MAX_SUBSTITUTIONS,
  type Player,
  type PlayerCondition,
} from "../../game";
import type { MessageKey } from "../../i18n";
import { useI18n } from "../i18n-provider";
import { TacticsEditor } from "../tactics-editor";
import { StatsPanel } from "./stats-panel";

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

export type AppliedHalfTimePlan = Extract<HalfTimePlan, { ok: true }>;

export type HalfTimePanelProps = {
  homeName: string;
  awayName: string;
  score: MatchState["score"];
  /** Statistics for the first half. */
  stats: MatchStats;
  /** Without an editor the panel offers no changes. Called with the validated plan, if any. */
  editor?: HalfTimeEditor;
  onResume: (plan?: AppliedHalfTimePlan) => void;
};

type Substitution = { off: string; on: string };

const ERROR_KEYS: Record<HalfTimeError, MessageKey> = {
  "too-many-substitutions": "halfTime.error.tooManySubstitutions",
  "player-not-on-pitch": "halfTime.error.playerNotOnPitch",
  "player-not-on-bench": "halfTime.error.playerNotOnBench",
  "position-mismatch": "halfTime.error.positionMismatch",
  "duplicate-substitution": "halfTime.error.duplicateSubstitution",
};

const sameTactics = (a: TeamTactics, b: TeamTactics): boolean =>
  a.mentality === b.mentality &&
  a.pressing === b.pressing &&
  a.width === b.width &&
  a.tempo === b.tempo;

const positionOf = (editor: HalfTimeEditor, id: string): string | undefined =>
  editor.players.find((p) => p.id === id)?.position;

/** First bench player of the starter's position who is not coming on yet. */
const defaultOn = (editor: HalfTimeEditor, off: string, taken: readonly Substitution[]): string =>
  editor.bench.find(
    (id) => positionOf(editor, id) === positionOf(editor, off) && !taken.some((s) => s.on === id),
  ) ?? "";

const nextSubstitution = (
  editor: HalfTimeEditor,
  taken: readonly Substitution[],
): Substitution | undefined => {
  for (const off of editor.starters) {
    if (taken.some((s) => s.off === off)) continue;
    const on = defaultOn(editor, off, taken);
    if (on) return { off, on };
  }
  return undefined;
};

function Squad({ editor }: { editor: HalfTimeEditor }) {
  const { t, formatNumber } = useI18n();
  const rows = (title: MessageKey, ids: readonly string[]) => (
    <>
      <h4>{t(title)}</h4>
      <ul className="half-time-squad">
        {ids.map((id) => {
          const player = editor.players.find((p) => p.id === id);
          const condition = editor.condition[id];
          return (
            <li key={id}>
              {player?.name} ({player ? t(`position.short.${player.position}`) : ""}){" "}
              {t("squad.col.fitness")}{" "}
              <span data-testid={`half-time-fitness-${id}`}>
                {formatNumber(condition?.fitness ?? 100, 0)}
              </span>{" "}
              {t("squad.col.form")}{" "}
              <span data-testid={`half-time-form-${id}`}>
                {formatNumber(condition?.form ?? 5, 0)}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
  return (
    <>
      {rows("squad.starters", editor.starters)}
      {rows("squad.bench", editor.bench)}
    </>
  );
}

function PlayerOptions({ editor, ids }: { editor: HalfTimeEditor; ids: readonly string[] }) {
  const { t } = useI18n();
  return ids.map((id) => {
    const player = editor.players.find((p) => p.id === id);
    return (
      <option key={id} value={id}>
        {player ? `${player.name} (${t(`position.short.${player.position}`)})` : id}
      </option>
    );
  });
}

function Changes({
  editor,
  onResume,
}: {
  editor: HalfTimeEditor;
  onResume: (plan?: AppliedHalfTimePlan) => void;
}) {
  const { t } = useI18n();
  const [subs, setSubs] = useState<Substitution[]>([]);
  const [tactics, setTactics] = useState(editor.tactics);
  const [error, setError] = useState<HalfTimeError | null>(null);

  const edit = (next: Substitution[]) => {
    setSubs(next);
    setError(null);
  };
  const update = (index: number, patch: Partial<Substitution>) =>
    edit(subs.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const changeOff = (index: number, off: string) =>
    update(index, {
      off,
      on: defaultOn(
        editor,
        off,
        subs.filter((_, i) => i !== index),
      ),
    });
  const next = nextSubstitution(editor, subs);
  const full = subs.length >= MAX_SUBSTITUTIONS;

  const start = () => {
    if (subs.length === 0 && sameTactics(tactics, editor.tactics)) return onResume(undefined);
    const plan = editor.plan({ substitutions: subs, tactics });
    if (!plan.ok) return setError(plan.error);
    onResume(plan);
  };

  return (
    <section className="panel" data-testid="half-time-changes">
      <h3>{t("halfTime.changes")}</h3>
      <Squad editor={editor} />
      <h4>{t("halfTime.substitutions")}</h4>
      <ol className="half-time-subs">
        {subs.map((sub, i) => (
          // The row index is the identity of a pending substitution.
          // biome-ignore lint/suspicious/noArrayIndexKey: pending rows have no id
          <li key={i}>
            <label>
              {t("halfTime.off")}{" "}
              <select
                data-testid={`sub-off-${i}`}
                value={sub.off}
                onChange={(e) => changeOff(i, e.target.value)}
              >
                <PlayerOptions editor={editor} ids={editor.starters} />
              </select>
            </label>{" "}
            <label>
              {t("halfTime.on")}{" "}
              <select
                data-testid={`sub-on-${i}`}
                value={sub.on}
                onChange={(e) => update(i, { on: e.target.value })}
              >
                <PlayerOptions
                  editor={editor}
                  ids={editor.bench.filter(
                    (id) => positionOf(editor, id) === positionOf(editor, sub.off),
                  )}
                />
              </select>
            </label>{" "}
            <button
              type="button"
              data-testid={`sub-remove-${i}`}
              onClick={() => edit(subs.filter((_, j) => j !== i))}
            >
              {t("halfTime.remove")}
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        data-testid="sub-add"
        disabled={full || !next}
        onClick={() => next && edit([...subs, next])}
      >
        {t("halfTime.addSubstitution")}
      </button>
      {full ? (
        <p data-testid="sub-limit">{t("halfTime.limit", { max: MAX_SUBSTITUTIONS })}</p>
      ) : null}
      <TacticsEditor tactics={tactics} onChange={setTactics} />
      {error ? (
        <p role="alert" data-testid="half-time-error">
          {t(ERROR_KEYS[error])}
        </p>
      ) : null}
      <button type="button" data-testid="start-second-half" onClick={start}>
        {t("halfTime.start")}
      </button>
    </section>
  );
}

/** Shown while the match is held at half-time; the user makes changes and starts the second half. */
export function HalfTimePanel({
  homeName,
  awayName,
  score,
  stats,
  editor,
  onResume,
}: HalfTimePanelProps) {
  const { t } = useI18n();
  return (
    <div
      className="half-time"
      role="dialog"
      aria-labelledby="half-time-title"
      data-testid="half-time"
    >
      <h2 id="half-time-title">{t("halfTime.title")}</h2>
      <p className="half-time-score" data-testid="half-time-score">
        {homeName} {score.home} – {score.away} {awayName}
      </p>
      <StatsPanel stats={stats} />
      {editor ? (
        <Changes editor={editor} onResume={onResume} />
      ) : (
        <button type="button" data-testid="start-second-half" onClick={() => onResume()}>
          {t("halfTime.start")}
        </button>
      )}
    </div>
  );
}
