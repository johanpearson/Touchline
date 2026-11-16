import { type ReactNode, useState } from "react";
import type { CommentaryLine } from "../../commentary";
import type { ActionEvent, ActionMatchState, MatchStats, PerSide, ZoneEvent } from "../../engine";
import { useI18n } from "../i18n-provider";
import { ClassicPitch } from "./classic-pitch";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { type AppliedHalfTimePlan, type HalfTimeEditor, HalfTimePanel } from "./half-time-panel";
import { MatchFeed } from "./match-feed";
import { MomentumChart } from "./momentum-chart";
import { MomentumTerrain } from "./momentum-terrain";
import { Scoreboard } from "./scoreboard";
import { SpeedControls } from "./speed-controls";
import type { TerrainRendererFactory } from "./terrain-renderer";
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
  stats: MatchStats;
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
  /** Shown at full time, above the "Continue" button (the player ratings). */
  fullTimePanel?: ReactNode;
  /** When given, a "Continue" button appears at full time. */
  onContinue?: () => void;
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
  lines,
  playback,
  createRenderer,
  pitch,
  halfTimeEditor,
  onResume,
  onContinue,
  statsPanel,
  fullTimePanel,
}: MatchLayoutProps) {
  const { t } = useI18n();
  const halfTime = period === "halfTime";
  const [chosenView, setView] = useViewChoice();
  const view = chosenView;
  const [showChain, setShowChain] = useState(true);
  return (
    <div className="match-screen" data-testid="match-screen">
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
      <div className="match-main">
        {pitch && (
          <fieldset className="view-toggle" data-testid="view-toggle">
            <legend>{t("match.view.label")}</legend>
            {(["momentum", "pitch"] as const).map((option) => (
              <button
                key={option}
                type="button"
                data-testid={`view-${option}`}
                aria-pressed={view === option}
                onClick={() => setView(option)}
              >
                {t(option === "pitch" ? "match.view.pitch" : "match.view.momentum")}
              </button>
            ))}
          </fieldset>
        )}
        {pitch && view === "pitch" && (
          <button
            type="button"
            className="chain-toggle"
            data-testid="chain-toggle"
            aria-pressed={showChain}
            onClick={() => setShowChain(!showChain)}
          >
            {t("match.chain.toggle")}
          </button>
        )}
        {pitch && view === "pitch" ? (
          <ClassicPitch
            events={pitch.events}
            matchTime={matchTime}
            score={score}
            homeColour={colours.home}
            awayColour={colours.away}
            showChain={showChain}
            setPieceLabels={{
              kickoff: t("match.setPiece.kickoff"),
              throwIn: t("match.setPiece.throwIn"),
              goalKick: t("match.setPiece.goalKick"),
              corner: t("match.setPiece.corner"),
              freeKick: t("match.setPiece.freeKick"),
              penalty: t("match.setPiece.penalty"),
            }}
            createRenderer={pitch.createRenderer}
            label={t("match.pitch")}
          />
        ) : (
          <MomentumTerrain
            events={terrainEvents}
            matchTime={matchTime}
            homeColour={colours.home}
            awayColour={colours.away}
            createRenderer={createRenderer}
            label={t("match.terrain")}
          />
        )}
        {halfTime && (
          <HalfTimePanel
            homeName={names.home}
            awayName={names.away}
            score={score}
            stats={stats}
            editor={halfTimeEditor}
            onResume={onResume}
          />
        )}
        {period === "fullTime" && fullTimePanel}
        {period === "fullTime" && onContinue && (
          <button type="button" data-testid="continue" onClick={onContinue}>
            {t("match.continue")}
          </button>
        )}
        <SpeedControls
          paused={playback.paused}
          speed={playback.speed}
          onPausedChange={playback.setPaused}
          onSpeedChange={playback.setSpeed}
        />
      </div>
      <aside className="match-side">
        {!halfTime && statsPanel}
        <MomentumChart
          events={events}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
        />
        <MatchFeed
          lines={lines}
          events={events}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
        />
      </aside>
    </div>
  );
}
