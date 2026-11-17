import { ArrowLeft } from "lucide-react";
import { Button } from "../components/button";
import { ConfirmDialog } from "../components/confirm-dialog";
import { useI18n } from "../i18n-provider";

export type LeaveMatchButtonProps = {
  /** Called after the user confirms leaving. */
  onLeave: () => void;
};

/** The back link to the hub. Leaving mid-match restarts it from kick-off, so it asks first. */
export function LeaveMatchButton({ onLeave }: LeaveMatchButtonProps) {
  const { t } = useI18n();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" data-testid="leave-match" className="self-start">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t("match.back")}
        </Button>
      }
      title={t("match.leave.title")}
      description={t("match.leave.body")}
      confirmLabel={t("match.leave.confirm")}
      cancelLabel={t("match.leave.cancel")}
      closeLabel={t("match.close")}
      confirmTestId="leave-match-confirm"
      onConfirm={onLeave}
    />
  );
}
