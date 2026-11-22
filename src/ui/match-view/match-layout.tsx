import { type ReactNode, useCallback, useState } from "react";
import type { CommentaryLine } from "../../commentary";
import type { ActionEvent, ActionMatchState, ActionStats, PerSide, ZoneEvent } from "../../engine";
import type { MessageKey } from "../../i18n";
import { Button } from "../components/button";
import { useI18n } from "../i18n-provider";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import type { PlaybackMode, SegmentChance } from "./director";
import { type ChangesEditor, HalfTimePanel, type PlannedEditorChange } from "./half-time-panel";
import { HalfTimeSheet } from "./half-time-sheet";
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
  /** Player names by id, for the chance cue. */
  players?: Readonly<Record<string, string>>;
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
    mode: PlaybackMode;
    chance?: SegmentChance;
    setPaused: (paused: boolean) => void;
    setMode: (mode: PlaybackMode) => void;
  };
  createRenderer?: TerrainRendererFactory;
  /** The action log and renderer of the 2D pitch. */
  pitch: { events: readonly ActionEvent[]; createRenderer?: PitchRendererFactory };
  /** What the user can change now; absent when the match offers no changes. */
  editor?: ChangesEditor;
  /** Starts the second half, with the user's half-time change if there is one. */
  onResume: (plan?: PlannedEditorChange) => void;
  /** Applies a change made while the match is paused. */
  onChange?: (plan: PlannedEditorChange) => void;
  /** Match times of the user's changes, marked in the momentum chart. */
  changeTimes?: readonly number[];
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
  /** A restored match that has not been started again yet: the pause button says "Resume". */
  awaitingResume?: boolean;
};

/** Why "Make changes" is unavailable: after full time, while the match runs, or with no editor. */
const changesHintOf = (period: ActionMatchState["period"], hasEditor: boolean): MessageKey => {
  if (period === "fullTime") return "controls.changesHint.fullTime";
  return hasEditor ? "controls.changesHint.playing" : "controls.changesHint.unavailable";
};

/** The panels of the match screen; `MatchScreen` feeds it. */
export function MatchLayout({
  names,
  players,
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
  awaitingResume,
  createRenderer,
  pitch,
  editor,
  onResume,
  onChange,
  changeTimes,
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
  const canMakeChanges = Boolean(editor) && (halfTime || (playing && paused));
  const changesHint = changesHintOf(period, editor !== undefined);
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
          chance={playback.chance}
          teamNames={names}
          players={players ?? {}}
        />
        <MatchControls
          paused={paused}
          awaitingResume={awaitingResume}
          mode={playback.mode}
          view={view}
          showChain={showChain}
          canMakeChanges={canMakeChanges}
          changesHint={changesHint}
          onPausedChange={setPaused}
          onModeChange={playback.setMode}
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
            editor={editor}
            onResume={onResume}
            changesOpen={changesOpen}
            onChangesOpenChange={setChangesOpen}
          />
        )}
        {changesOpen && editor && !halfTime ? (
          <HalfTimeSheet
            editor={editor}
            open
            onOpenChange={setChangesOpen}
            onApply={(plan) => {
              if (plan) onChange?.(plan);
              setChangesOpen(false);
            }}
          />
        ) : null}
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
          changeTimes={changeTimes}
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
