import { useState } from "react";
import type { PlanChangeError } from "../../game";
import { Button } from "../components/button";
import { ConfirmDialog } from "../components/confirm-dialog";
import { Drawer } from "../components/drawer";
import { useI18n } from "../i18n-provider";
import { HalfTimeChanges } from "./half-time-changes";
import {
  type ChangeDraft,
  type ChangesEditor,
  changeOf,
  ERROR_KEYS,
  freshDraft,
  hasPending,
  type PlannedEditorChange,
} from "./half-time-model";

export type HalfTimeSheetProps = {
  editor: ChangesEditor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called with the validated change. At half-time "Start second half" calls it with no change when
   * nothing was edited; elsewhere "Apply changes" is only enabled with something to apply.
   */
  onApply: (plan?: PlannedEditorChange) => void;
  /** Starting state, for stories and visual tests. */
  initial?: { pending?: ChangeDraft; error?: PlanChangeError };
};

/**
 * "Make changes" at a stoppage: a side drawer on desktop and a full-height bottom sheet on phones.
 * Closing with pending changes asks first. The action button ("Start second half" at half-time,
 * "Apply changes" otherwise) sits in a sticky bar that comes second in tab order, right after the
 * close button, although it is drawn at the bottom.
 */
export function HalfTimeSheet({
  editor,
  open,
  onOpenChange,
  onApply,
  initial,
}: HalfTimeSheetProps) {
  const { t } = useI18n();
  const [pending, setPending] = useState(initial?.pending ?? freshDraft(editor));
  const [error, setError] = useState<PlanChangeError | null>(initial?.error ?? null);
  const [confirming, setConfirming] = useState(false);
  const changed = hasPending(editor, pending);

  const close = () => {
    setPending(freshDraft(editor));
    setError(null);
    setConfirming(false);
    onOpenChange(false);
  };
  const requestClose = () => (changed ? setConfirming(true) : close());
  const apply = () => {
    if (!changed) return onApply(undefined);
    const plan = editor.plan(pending);
    if (!plan.ok) return setError(plan.error);
    setPending(freshDraft(editor));
    onApply({ ...plan, request: changeOf(editor, pending) });
  };
  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title={t("controls.changes")}
        description={t(editor.halfTime ? "halfTime.changes" : "changes.description")}
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
          <Button
            variant="primary"
            size="lg"
            data-testid={editor.halfTime ? "start-second-half" : "apply-changes"}
            disabled={!editor.halfTime && !changed}
            onClick={apply}
          >
            {t(editor.halfTime ? "halfTime.start" : "changes.apply")}
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
