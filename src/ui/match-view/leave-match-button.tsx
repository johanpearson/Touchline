import { ArrowLeft } from "lucide-react";
import { Button } from "../components/button";
import { useI18n } from "../i18n-provider";

export type LeaveMatchButtonProps = {
  /** Called when the user presses the link; a match in progress asks before it lets them go. */
  onLeave: () => void;
};

/** The back link to the hub. The match screen's navigation guard asks first when the match is on. */
export function LeaveMatchButton({ onLeave }: LeaveMatchButtonProps) {
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      data-testid="leave-match"
      className="self-start"
      onClick={onLeave}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {t("match.back")}
    </Button>
  );
}
