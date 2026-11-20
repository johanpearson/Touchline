import { useState } from "react";
import { type PlayerPosition, SHOUT_KINDS, type ShoutKind } from "../../game";
import type { MessageKey } from "../../i18n";
import { Button } from "../components/button";
import { useI18n } from "../i18n-provider";
import { TacticControls } from "../tactics/tactic-controls";
import {
  type ChangeDraft,
  type ChangesEditor,
  noWindowLeft,
  playerOf,
  positionOn,
  replacementsFor,
  type Substitution,
  shoutBlock,
  starterCanGoOff,
  substitutionsLeft,
  windowsLeft,
} from "./half-time-model";
import { type RowMark, SquadSection } from "./half-time-squad";

export { type ChangeDraft, hasPending } from "./half-time-model";

/** `null` is idle, `{ off: null }` waits for the player going off, `{ off: id }` for the one coming on. */
type Picking = { off: string | null } | null;

function PendingList(props: {
  editor: ChangesEditor;
  subs: readonly Substitution[];
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();
  const name = (id: string) => playerOf(props.editor, id)?.name ?? id;
  const left = substitutionsLeft(props.editor, props.subs.length);
  return (
    <section className="flex flex-col gap-2" data-testid="pending-subs">
      <h4 className="m-0 flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-soft">
        {t("halfTime.substitutions")}
        <span data-testid="sub-count" className="font-normal normal-case">
          {t("changes.left", { count: left })}
        </span>
      </h4>
      {props.editor.halfTime ? null : (
        <p className="m-0 text-sm text-soft" data-testid="window-count">
          {t("changes.windowsLeft", { count: windowsLeft(props.editor) })}
        </p>
      )}
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
  editor: ChangesEditor;
  pending: ChangeDraft;
  onPendingChange: (pending: ChangeDraft) => void;
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
  /** Why no substitution can be added, when none can. */
  blocked: MessageKey | null;
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
      {props.blocked ? (
        <p className="m-0 text-soft" data-testid="sub-limit">
          {t(props.blocked)}
        </p>
      ) : null}
    </>
  );
}

const SHOUT_LABELS: Record<ShoutKind, MessageKey> = {
  pushUp: "shout.pushUp",
  calmDown: "shout.calmDown",
  pressTheBall: "shout.pressTheBall",
  holdShape: "shout.holdShape",
};

const SHOUT_REASONS = {
  "shout-active": "changes.shoutBlocked.active",
  "shout-cooling-down": "changes.shoutBlocked.coolingDown",
  "shout-no-effect": "changes.shoutBlocked.noEffect",
} as const;

/** The touchline shouts: one at a time, each with the reason when it cannot be given now. */
function Shouts(props: {
  editor: ChangesEditor;
  draft: ChangeDraft;
  onShout: (s?: ShoutKind) => void;
}) {
  const { t } = useI18n();
  const { editor, draft } = props;
  return (
    <section className="flex flex-col gap-2" data-testid="shouts">
      <h4 className="m-0 text-sm font-semibold uppercase tracking-wide text-soft">
        {t("changes.shouts")}
      </h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {SHOUT_KINDS.map((kind) => {
          const block = shoutBlock(editor, draft, kind);
          const chosen = draft.shout === kind;
          return (
            <li key={kind} className="flex flex-col gap-0.5">
              <Button
                data-testid={`shout-${kind}`}
                aria-pressed={chosen}
                aria-disabled={block ? true : undefined}
                aria-describedby={block ? `shout-reason-${kind}` : undefined}
                onClick={block ? undefined : () => props.onShout(chosen ? undefined : kind)}
              >
                {t(SHOUT_LABELS[kind])}
              </Button>
              {block ? (
                <span id={`shout-reason-${kind}`} className="text-sm text-soft">
                  {t(SHOUT_REASONS[block])}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const blockedReason = (editor: ChangesEditor, pending: number): MessageKey | null => {
  if (substitutionsLeft(editor, pending) === 0) return "changes.noSubstitutionsLeft";
  return noWindowLeft(editor) ? "changes.noWindowLeft" : null;
};

/** Substitution flow, squad lists, shouts and tactics of the "Make changes" sheet. */
export function HalfTimeChanges(props: HalfTimeChangesProps) {
  const { editor, pending, onPendingChange } = props;
  const [picking, setPicking] = useState<Picking>(null);
  const { subs } = pending;
  const offId = picking?.off ?? null;
  const change = (next: ChangeDraft) => {
    onPendingChange(next);
    props.onEdit();
  };
  const pickOn = (on: string) => {
    if (offId === null) return;
    change({ ...pending, subs: [...subs, { off: offId, on }] });
    setPicking(null);
  };
  const replacements = replacementsFor(editor, subs);
  const marks = marksOf(subs);
  const blocked = blockedReason(editor, subs.length);
  const onPitch = (id: string): PlayerPosition => positionOn(editor, id);
  const target: PlayerPosition | null = offId === null ? null : onPitch(offId);
  return (
    <div className="flex flex-col gap-5" data-testid="half-time-changes">
      <PendingList
        editor={editor}
        subs={subs}
        onRemove={(index) => change({ ...pending, subs: subs.filter((_, i) => i !== index) })}
      />
      <AddControls
        picking={picking}
        blocked={blocked}
        canAdd={blocked === null && editor.starters.some((id) => starterCanGoOff(editor, id, subs))}
        onPicking={setPicking}
      />
      <SquadSection
        editor={editor}
        title="squad.starters"
        ids={editor.starters}
        marks={marks}
        positionOf={onPitch}
        pickable={(id) => picking?.off === null && starterCanGoOff(editor, id, subs)}
        onPick={(id) => setPicking({ off: id })}
      />
      <SquadSection
        editor={editor}
        title="squad.bench"
        ids={editor.bench}
        marks={marks}
        positionOf={(id) => target ?? playerOf(editor, id)?.position ?? "MID"}
        asPosition={(id) => target !== null && target !== playerOf(editor, id)?.position}
        pickable={(id) => replacements.includes(id) && offId !== null}
        onPick={pickOn}
      />
      <Shouts editor={editor} draft={pending} onShout={(shout) => change({ ...pending, shout })} />
      <TacticControls
        tactics={pending.tactics}
        onChange={(tactics) => change({ ...pending, tactics })}
      />
    </div>
  );
}
