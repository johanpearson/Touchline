import { Pause, Play, Route, SquarePen } from "lucide-react";
import { Button } from "../components/button";
import { SegmentedControl } from "../components/segmented-control";
import { Tooltip } from "../components/tooltip";
import { useI18n } from "../i18n-provider";
import { MODE_TARGET_MINUTES, PLAYBACK_MODES, type PlaybackMode } from "./director";
import type { MatchView } from "./use-view-choice";

export type MatchControlsProps = {
  paused: boolean;
  mode: PlaybackMode;
  view: MatchView;
  /** Whether the 2D pitch passing chain is drawn; the toggle shows only in the 2D view. */
  showChain: boolean;
  /** "Make changes" works only at half-time until in-match changes exist (#266). */
  canMakeChanges: boolean;
  onPausedChange: (paused: boolean) => void;
  onModeChange: (mode: PlaybackMode) => void;
  onViewChange: (view: MatchView) => void;
  onChainChange: (show: boolean) => void;
  onMakeChanges: () => void;
};

const HINT_ID = "make-changes-hint";

/** The middle of the mode's target range, rounded: "about 2 minutes". */
const typicalMinutes = (mode: PlaybackMode): number => {
  const { min, max } = MODE_TARGET_MINUTES[mode];
  return Math.round((min + max) / 2);
};

/**
 * The control row under the stage: Pause, Make changes, view switch, playback mode. The place after
 * "Make changes" is reserved for the touchline shouts (#266); nothing is rendered for them yet.
 */
export function MatchControls(props: MatchControlsProps) {
  const { t } = useI18n();
  const { paused, canMakeChanges } = props;
  const PauseIcon = paused ? Play : Pause;
  return (
    <fieldset
      className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
      data-testid="match-controls"
    >
      <legend className="sr-only">{t("controls.label")}</legend>
      <Tooltip content={t("controls.shortcut")}>
        <Button
          variant="primary"
          data-testid="pause-toggle"
          aria-keyshortcuts="Space"
          onClick={() => props.onPausedChange(!paused)}
        >
          <PauseIcon aria-hidden="true" className="size-4" />
          {paused ? t("controls.play") : t("controls.pause")}
        </Button>
      </Tooltip>
      <Tooltip content={canMakeChanges ? t("halfTime.title") : t("controls.changesHint")}>
        <Button
          data-testid="make-changes"
          aria-disabled={!canMakeChanges || undefined}
          aria-describedby={canMakeChanges ? undefined : HINT_ID}
          onClick={canMakeChanges ? props.onMakeChanges : undefined}
        >
          <SquarePen aria-hidden="true" className="size-4" />
          {t("controls.changes")}
        </Button>
      </Tooltip>
      {!canMakeChanges && (
        <span id={HINT_ID} className="sr-only">
          {t("controls.changesHint")}
        </span>
      )}
      <SegmentedControl
        label={t("match.view.label")}
        testId="view-toggle"
        value={props.view}
        onValueChange={props.onViewChange}
        options={[
          { value: "momentum", label: t("match.view.momentum"), testId: "view-momentum" },
          { value: "pitch", label: t("match.view.pitch"), testId: "view-pitch" },
        ]}
      />
      {props.view === "pitch" && (
        <Button
          size="sm"
          data-testid="chain-toggle"
          aria-pressed={props.showChain}
          onClick={() => props.onChainChange(!props.showChain)}
        >
          <Route aria-hidden="true" className="size-4" />
          {t("match.chain.toggle")}
        </Button>
      )}
      <SegmentedControl
        label={t("controls.modeLabel")}
        testId="mode-toggle"
        value={props.mode}
        onValueChange={props.onModeChange}
        options={PLAYBACK_MODES.map((mode) => ({
          value: mode,
          label: t(`controls.mode.${mode}`),
          description: t("controls.mode.minutes", { count: typicalMinutes(mode) }),
          testId: `mode-${mode}`,
        }))}
      />
    </fieldset>
  );
}
