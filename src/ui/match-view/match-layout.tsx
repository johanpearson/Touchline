import { type ReactNode, useCallback, useState } from "react";
import type { CommentaryLine } from "../../commentary";
import type { ActionEvent, ActionMatchState, ActionStats, PerSide, ZoneEvent } from "../../engine";
import { Button } from "../components/button";
import { useI18n } from "../i18n-provider";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { type AppliedHalfTimePlan, type HalfTimeEditor, HalfTimePanel } from "./half-time-panel";
import { LeaveMatchButton } from "./leave-match-button";
import { MatchControls } from "./match-controls";
import { MatchFeed } from "./match-feed";
import { MatchSidePanel } from "./match-side-panel";
import { MatchStage } from "./match-stage";
import { MomentumChart } from "./momentum-chart";
import { Scoreboard } from "./scoreboard";
import { attackingSide, describeStage } from "./stage-summary";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { usePauseShortcut } from "./use-pause-shortcut";
import { useViewChoice } from "./use-view-choice";
import "./match-screen.css";

export type MatchLayoutProps = {
  names: PerSide<string>;
  colours: PerSide<string>;
  score: ActionMatchState["score"];
  period: ActionMatchState["period"];
  matchTime: number;
  /** The whole log as zone events: the minute labels, the momentum chart and the feed read it. */
  events: readonly ZoneEvent[];
  /** The part of it the terrain shows. */
  terrainEvents: readonly ZoneEvent[];
  /** First-half stats shown by the half-time panel. */
  stats: ActionStats;
  /** Ids of the players who played, per side. */
  playerIds: PerSide<readonly string[]>;
  lines: readonly CommentaryLine[];
  playback: {
    paused: boolean;
    speed: number;
    setPaused: (paused: boolean) => void;
    setSpeed: (speed: number) => void;
  };
  createRenderer?: TerrainRendererFactory;
  /** The action log and renderer of the 2D pitch. */
  pitch: { events: readonly ActionEvent[]; createRenderer?: PitchRendererFactory };
  halfTimeEditor?: HalfTimeEditor;
  onResume: (plan?: AppliedHalfTimePlan) => void;
  /** The in-match stats panel, hidden at half-time (the half-time panel has its own). */
  statsPanel: ReactNode;
  /** Both elevens with live ratings, in a dialog or tab. */
  lineupsPanel: ReactNode;
  /** Shown at full time, above the "Continue" button (the player ratings). */
  fullTimePanel?: ReactNode;
  /** When given, a "Continue" button appears at full time. */
  onContinue?: () => void;
  /** When given, a back link to the hub appears; it asks before calling this. */
  onLeave?: () => void;
};

/** The panels of the match screen; `MatchScreen` feeds it. */
export function MatchLayout({
  names,
  colours,
  score,
  period,
  matchTime,
  events,
  terrainEvents,
  stats,
  playerIds,
  lines,
  playback,
  createRenderer,
  pitch,
  halfTimeEditor,
  onResume,
  onContinue,
  onLeave,
  statsPanel,
  lineupsPanel,
  fullTimePanel,
}: MatchLayoutProps) {
  const { t } = useI18n();
  const halfTime = period === "halfTime";
  const [view, setView] = useViewChoice();
  const [showChain, setShowChain] = useState(true);
  const { paused, setPaused } = playback;
  const playing = period === "firstHalf" || period === "secondHalf";
  usePauseShortcut(
    playing,
    useCallback(() => setPaused(!paused), [paused, setPaused]),
  );
  const [changesOpen, setChangesOpen] = useState(false);
  const makeChanges = () => setChangesOpen(true);
  const stageLabel = `${view === "pitch" ? t("match.pitch") : t("match.terrain")}. ${describeStage({
    t,
    names,
    score,
    attacking: attackingSide(events, matchTime),
  })}`;
  return (
    <div
      className="match-screen mx-auto grid max-w-[1400px] min-w-0 gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]"
      data-testid="match-screen"
    >
      <div className="flex min-w-0 flex-col gap-2 min-[1100px]:col-span-full">
        {onLeave && <LeaveMatchButton onLeave={onLeave} />}
        <Scoreboard
          homeName={names.home}
          awayName={names.away}
          homeColour={colours.home}
          awayColour={colours.away}
          score={score}
          period={period}
          matchTime={matchTime}
          events={events}
        />
      </div>
      <div className="match-main flex min-w-0 flex-col gap-3">
        <MatchStage
          view={view}
          label={stageLabel}
          colours={colours}
          matchTime={matchTime}
          terrainEvents={terrainEvents}
          createRenderer={createRenderer}
          pitch={pitch}
          showChain={showChain}
        />
        <MatchControls
          paused={paused}
          speed={playback.speed}
          view={view}
          showChain={showChain}
          canMakeChanges={halfTime && Boolean(halfTimeEditor)}
          onPausedChange={setPaused}
          onSpeedChange={playback.setSpeed}
          onViewChange={setView}
          onChainChange={setShowChain}
          onMakeChanges={makeChanges}
        />
        {halfTime && (
          <HalfTimePanel
            homeName={names.home}
            awayName={names.away}
            score={score}
            stats={stats}
            playerIds={playerIds}
            editor={halfTimeEditor}
            onResume={onResume}
            changesOpen={changesOpen}
            onChangesOpenChange={setChangesOpen}
          />
        )}
        {period === "fullTime" && fullTimePanel}
        {period === "fullTime" && onContinue && (
          <Button
            variant="primary"
            size="lg"
            className="self-start"
            data-testid="continue"
            onClick={onContinue}
          >
            {t("match.continue")}
          </Button>
        )}
        <MomentumChart
          events={events}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
          names={names}
        />
      </div>
      <MatchSidePanel
        stats={halfTime ? null : statsPanel}
        feed={
          <MatchFeed
            lines={lines}
            events={events}
            matchTime={matchTime}
            homeColour={colours.home}
            awayColour={colours.away}
          />
        }
        lineups={lineupsPanel}
      />
    </div>
  );
}
