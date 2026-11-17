import { useState } from "react";
import type { TeamTactics } from "../../engine";
import { type HalfTimePlan, MAX_SUBSTITUTIONS } from "../../game";
import { Button } from "../components/button";
import { useI18n } from "../i18n-provider";
import { TacticControls } from "../tactics/tactic-controls";
import {
  type HalfTimeEditor,
  playerOf,
  replacementsFor,
  type Substitution,
  sameTactics,
  starterCanGoOff,
} from "./half-time-model";
import { type RowMark, SquadSection } from "./half-time-squad";

export type AppliedHalfTimePlan = Extract<HalfTimePlan, { ok: true }>;

/** The pending changes of the sheet: substitutions in the order they were made, and tactics. */
export type PendingChanges = { subs: Substitution[]; tactics: TeamTactics };

export const hasPending = (editor: HalfTimeEditor, pending: PendingChanges): boolean =>
  pending.subs.length > 0 || !sameTactics(pending.tactics, editor.tactics);

/** `null` is idle, `{ off: null }` waits for the player going off, `{ off: id }` for the one coming on. */
type Picking = { off: string | null } | null;

function PendingList(props: {
  editor: HalfTimeEditor;
  subs: readonly Substitution[];
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();
  const name = (id: string) => playerOf(props.editor, id)?.name ?? id;
  return (
    <section className="flex flex-col gap-2" data-testid="pending-subs">
      <h4 className="m-0 flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-soft">
        {t("halfTime.substitutions")}
        <span data-testid="sub-count" className="font-normal normal-case">
          {t("halfTime.count", { count: props.subs.length, max: MAX_SUBSTITUTIONS })}
        </span>
      </h4>
      {props.subs.length === 0 ? <p className="m-0 text-soft">{t("halfTime.noPending")}</p> : null}
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {props.subs.map((sub, i) => (
          // The row index is the identity of a pending substitution.
          // biome-ignore lint/suspicious/noArrayIndexKey: pending rows have no id
          <li key={i} className="flex min-h-11 items-center justify-between gap-3">
            <span>
              <span className="text-soft">{t("halfTime.off")}</span>{" "}
              <span data-testid={`sub-off-${i}`} data-player-id={sub.off} className="font-semibold">
                {name(sub.off)}
              </span>{" "}
              <span className="text-soft">{t("halfTime.on")}</span>{" "}
              <span data-testid={`sub-on-${i}`} data-player-id={sub.on} className="font-semibold">
                {name(sub.on)}
              </span>
            </span>
            <Button size="sm" data-testid={`sub-remove-${i}`} onClick={() => props.onRemove(i)}>
              {t("halfTime.undo")}
            </Button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export type HalfTimeChangesProps = {
  editor: HalfTimeEditor;
  pending: PendingChanges;
  onPendingChange: (pending: PendingChanges) => void;
  onEdit: () => void;
};

const marksOf = (subs: readonly Substitution[]): Record<string, RowMark> => {
  const marks: Record<string, RowMark> = {};
  for (const sub of subs) {
    marks[sub.off] = "off";
    marks[sub.on] = "on";
  }
  return marks;
};

function AddControls(props: {
  picking: Picking;
  canAdd: boolean;
  full: boolean;
  onPicking: (p: Picking) => void;
}) {
  const { t } = useI18n();
  if (props.picking) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p role="status" data-testid="sub-prompt" className="m-0 font-semibold">
          {t(props.picking.off === null ? "halfTime.pick.off" : "halfTime.pick.on")}
        </p>
        <Button size="sm" data-testid="sub-cancel" onClick={() => props.onPicking(null)}>
          {t("halfTime.cancelPick")}
        </Button>
      </div>
    );
  }
  return (
    <>
      <Button
        data-testid="sub-add"
        disabled={!props.canAdd}
        onClick={() => props.onPicking({ off: null })}
      >
        {t("halfTime.addSubstitution")}
      </Button>
      {props.full ? (
        <p className="m-0 text-soft" data-testid="sub-limit">
          {t("halfTime.limit", { max: MAX_SUBSTITUTIONS })}
        </p>
      ) : null}
    </>
  );
}

/** Substitution flow, squad lists and tactics of the "Make changes" sheet. */
export function HalfTimeChanges(props: HalfTimeChangesProps) {
  const { editor, pending, onPendingChange } = props;
  const [picking, setPicking] = useState<Picking>(null);
  const { subs } = pending;
  const offId = picking?.off ?? null;
  const change = (next: PendingChanges) => {
    onPendingChange(next);
    props.onEdit();
  };
  const pickOn = (on: string) => {
    if (offId === null) return;
    change({ ...pending, subs: [...subs, { off: offId, on }] });
    setPicking(null);
  };
  const replacements = offId === null ? [] : replacementsFor(editor, offId, subs);
  const marks = marksOf(subs);
  const full = subs.length >= MAX_SUBSTITUTIONS;
  return (
    <div className="flex flex-col gap-5" data-testid="half-time-changes">
      <PendingList
        editor={editor}
        subs={subs}
        onRemove={(index) => change({ ...pending, subs: subs.filter((_, i) => i !== index) })}
      />
      <AddControls
        picking={picking}
        full={full}
        canAdd={!full && editor.starters.some((id) => starterCanGoOff(editor, id, subs))}
        onPicking={setPicking}
      />
      <SquadSection
        editor={editor}
        title="squad.starters"
        ids={editor.starters}
        marks={marks}
        pickable={(id) => picking?.off === null && starterCanGoOff(editor, id, subs)}
        onPick={(id) => setPicking({ off: id })}
      />
      <SquadSection
        editor={editor}
        title="squad.bench"
        ids={editor.bench}
        marks={marks}
        pickable={(id) => replacements.includes(id)}
        onPick={pickOn}
      />
      <TacticControls
        tactics={pending.tactics}
        onChange={(tactics) => change({ ...pending, tactics })}
      />
    </div>
  );
}
