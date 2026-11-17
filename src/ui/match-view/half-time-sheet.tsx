import { useState } from "react";
import type { HalfTimeError } from "../../game";
import type { MessageKey } from "../../i18n";
import { Button } from "../components/button";
import { ConfirmDialog } from "../components/confirm-dialog";
import { Drawer } from "../components/drawer";
import { useI18n } from "../i18n-provider";
import {
  type AppliedHalfTimePlan,
  HalfTimeChanges,
  hasPending,
  type PendingChanges,
} from "./half-time-changes";
import { type HalfTimeEditor, sameTactics } from "./half-time-model";

const ERROR_KEYS: Record<HalfTimeError, MessageKey> = {
  "too-many-substitutions": "halfTime.error.tooManySubstitutions",
  "player-not-on-pitch": "halfTime.error.playerNotOnPitch",
  "player-not-on-bench": "halfTime.error.playerNotOnBench",
  "position-mismatch": "halfTime.error.positionMismatch",
  "duplicate-substitution": "halfTime.error.duplicateSubstitution",
};

export type HalfTimeSheetProps = {
  editor: HalfTimeEditor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: (plan?: AppliedHalfTimePlan) => void;
  /** Starting state, for stories and visual tests. */
  initial?: { pending?: PendingChanges; error?: HalfTimeError };
};

/**
 * "Make changes" at half-time: a side drawer on desktop and a full-height bottom sheet on phones.
 * Closing with pending changes asks first. "Start second half" sits in a sticky bar that comes second
 * in tab order, right after the close button, although it is drawn at the bottom.
 */
export function HalfTimeSheet({
  editor,
  open,
  onOpenChange,
  onResume,
  initial,
}: HalfTimeSheetProps) {
  const { t } = useI18n();
  const fresh = (): PendingChanges => ({ subs: [], tactics: editor.tactics });
  const [pending, setPending] = useState(initial?.pending ?? fresh());
  const [error, setError] = useState<HalfTimeError | null>(initial?.error ?? null);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setPending(fresh());
    setError(null);
    setConfirming(false);
    onOpenChange(false);
  };
  const requestClose = () => (hasPending(editor, pending) ? setConfirming(true) : close());
  const start = () => {
    if (pending.subs.length === 0 && sameTactics(pending.tactics, editor.tactics)) {
      return onResume(undefined);
    }
    const plan = editor.plan({ substitutions: pending.subs, tactics: pending.tactics });
    if (!plan.ok) return setError(plan.error);
    onResume(plan);
  };
  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title={t("controls.changes")}
        description={t("halfTime.changes")}
        closeLabel={t("halfTime.close")}
        focusTitle
        className="max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none max-sm:border-t-0 sm:w-[28rem]"
      >
        <div
          className="sticky bottom-0 z-10 order-last -mx-6 mt-auto flex flex-col gap-2 border-t border-line bg-raised px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          data-testid="half-time-actions"
        >
          {error ? (
            <p role="alert" data-testid="half-time-error" className="m-0 font-semibold text-bad">
              {t(ERROR_KEYS[error])}
            </p>
          ) : null}
          <Button variant="primary" size="lg" data-testid="start-second-half" onClick={start}>
            {t("halfTime.start")}
          </Button>
        </div>
        <HalfTimeChanges
          editor={editor}
          pending={pending}
          onPendingChange={setPending}
          onEdit={() => setError(null)}
        />
      </Drawer>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("halfTime.discard.title")}
        description={t("halfTime.discard.description")}
        confirmLabel={t("halfTime.discard.confirm")}
        cancelLabel={t("halfTime.discard.keep")}
        closeLabel={t("halfTime.close")}
        destructive
        confirmTestId="half-time-discard"
        onConfirm={close}
      />
    </>
  );
}
