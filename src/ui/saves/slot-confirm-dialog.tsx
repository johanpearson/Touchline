import { ConfirmDialog } from "../components";
import { useI18n } from "../i18n-provider";
import { confirmTexts, type PendingAction } from "./confirm-texts";

type Props = {
  pending: PendingAction;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** The question before overwriting, deleting or importing over a used slot. */
export function SlotConfirmDialog({ pending, busy, onConfirm, onClose }: Props) {
  const { t } = useI18n();
  const texts = confirmTexts(pending, t);
  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={texts.title}
      description={texts.description}
      confirmLabel={texts.confirmLabel}
      cancelLabel={t("saves.cancel")}
      closeLabel={t("shell.close")}
      destructive
      busy={busy}
      confirmTestId={pending.action === "import" ? "import-confirm-yes" : "confirm-yes"}
      onConfirm={onConfirm}
    />
  );
}
