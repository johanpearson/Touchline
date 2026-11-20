import type { PerSide, ZoneEvent } from "../../engine";
import { Button } from "../components/button";
import { Dialog } from "../components/dialog";
import { useI18n } from "../i18n-provider";
import { formatMatchMinute } from "./match-minute";

export type LeaveMatchPromptProps = {
  /** The hash the user asked for; the question is open while there is one. */
  target: string | null;
  names: PerSide<string>;
  score: PerSide<number>;
  matchTime: number;
  events: readonly ZoneEvent[];
  onStay: () => void;
  onSimulate: (destination: string) => void;
};

/** The leave question with the score and minute of the match now. */
export function LeaveMatchPrompt({
  target,
  names,
  score,
  matchTime,
  events,
  onStay,
  onSimulate,
}: LeaveMatchPromptProps) {
  const { t } = useI18n();
  const status = t("match.leave.status", {
    home: names.home,
    homeGoals: score.home,
    awayGoals: score.away,
    away: names.away,
    minute: formatMatchMinute(matchTime, events),
  });
  return (
    <LeaveMatchDialog
      open={target !== null}
      status={status}
      onStay={onStay}
      onSimulate={() => target !== null && onSimulate(target)}
    />
  );
}

export type LeaveMatchDialogProps = {
  open: boolean;
  /** The score and minute now, already in words: "Kvarnby 1–0 Västerås, 34’". */
  status: string;
  /** The user decided to keep the match: the dialog closes, the match goes on. */
  onStay: () => void;
  /** The user wants the result now and then to go where they asked. */
  onSimulate: () => void;
};

/**
 * Asked when the user tries to leave a match in progress. Stay is the default and has the focus;
 * Escape means Stay. The user answers it before anything else: no close button, no outside click.
 */
export function LeaveMatchDialog({ open, status, onStay, onSimulate }: LeaveMatchDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog
      alert
      open={open}
      onOpenChange={(next) => {
        if (!next) onStay();
      }}
      title={t("match.leave.title")}
      description={t("match.leave.body")}
      closeLabel={t("match.close")}
      actions={
        <>
          <Button variant="primary" data-testid="leave-match-stay" onClick={onStay}>
            {t("match.leave.cancel")}
          </Button>
          <Button variant="secondary" data-testid="leave-match-simulate" onClick={onSimulate}>
            {t("match.leave.confirm")}
          </Button>
        </>
      }
    >
      <p
        data-testid="leave-match-status"
        className="m-0 font-heading text-lg font-semibold text-text"
      >
        {status}
      </p>
    </Dialog>
  );
}
