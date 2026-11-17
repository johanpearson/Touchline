import { useState } from "react";
import type { ActionMatchState, ActionStats, PerSide } from "../../engine";
import { Button } from "../components/button";
import { useI18n } from "../i18n-provider";
import { ActionStatsPanel } from "./action-stats-panel";
import type { AppliedHalfTimePlan } from "./half-time-changes";
import type { HalfTimeEditor } from "./half-time-model";
import { HalfTimeSheet } from "./half-time-sheet";

export type { AppliedHalfTimePlan } from "./half-time-changes";
export type { HalfTimeEditor } from "./half-time-model";

export type HalfTimePanelProps = {
  homeName: string;
  awayName: string;
  score: ActionMatchState["score"];
  /** Statistics for the first half. */
  stats: ActionStats;
  /** Ids of the players of each side, to total their key passes. */
  playerIds: PerSide<readonly string[]>;
  /** Without an editor the panel offers no changes. Called with the validated plan, if any. */
  editor?: HalfTimeEditor;
  onResume: (plan?: AppliedHalfTimePlan) => void;
  /** Whether the "Make changes" sheet is open; the match controls open it. Uncontrolled when absent. */
  changesOpen?: boolean;
  onChangesOpenChange?: (open: boolean) => void;
};

/** Shown while the match is held at half-time: the score and stats, and the way into the changes. */
export function HalfTimePanel(props: HalfTimePanelProps) {
  const { t } = useI18n();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = props.changesOpen ?? ownOpen;
  const setOpen = props.onChangesOpenChange ?? setOwnOpen;
  const { editor } = props;
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
      aria-labelledby="half-time-title"
      data-testid="half-time"
    >
      <h2 id="half-time-title" className="m-0 font-heading text-2xl font-semibold">
        {t("halfTime.title")}
      </h2>
      <p className="m-0 text-lg font-semibold" data-testid="half-time-score">
        {props.homeName} {props.score.home} – {props.score.away} {props.awayName}
      </p>
      <ActionStatsPanel stats={props.stats} playerIds={props.playerIds} />
      <div className="flex flex-wrap gap-2">
        {editor ? (
          <Button data-testid="half-time-open-changes" onClick={() => setOpen(true)}>
            {t("controls.changes")}
          </Button>
        ) : null}
        {open ? null : (
          <Button
            variant="primary"
            data-testid="start-second-half"
            onClick={() => props.onResume()}
          >
            {t("halfTime.start")}
          </Button>
        )}
      </div>
      {editor ? (
        <HalfTimeSheet
          editor={editor}
          open={open}
          onOpenChange={setOpen}
          onResume={props.onResume}
        />
      ) : null}
    </section>
  );
}
