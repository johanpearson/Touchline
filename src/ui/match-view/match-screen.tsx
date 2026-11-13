import { useMemo, useState } from "react";
import { generateCommentary } from "../../commentary";
import type { MatchInput, MatchState, PerSide } from "../../engine";
import { computeMatchStats, createMatch } from "../../engine";
import type { SquadPlayer } from "../../game";
import { attributeGoalScorers } from "../../game";
import { useI18n } from "../i18n-provider";
import { HalfTimePanel } from "./half-time-panel";
import { MatchFeed } from "./match-feed";
import { MomentumChart } from "./momentum-chart";
import { MomentumTerrain } from "./momentum-terrain";
import { Scoreboard } from "./scoreboard";
import { SpeedControls } from "./speed-controls";
import { StatsPanel } from "./stats-panel";
import { terrainEvents } from "./terrain-events";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { useMatchPlayback } from "./use-match-playback";
import "./match-screen.css";

export type MatchScreenProps = {
  input: MatchInput;
  seed: number;
  colours: PerSide<string>;
  /** The players goals are credited to, by position and finishing. */
  squads: PerSide<readonly SquadPlayer[]>;
  /** Replaces the three.js renderer, for tests. */
  createRenderer?: TerrainRendererFactory;
  /** How often the clock advances, in milliseconds; tests use a coarser tick. */
  tickMs?: number;
  /** When given, a "Continue" button appears at full time and calls this with the final score. */
  onContinue?: (score: MatchState["score"]) => void;
};

/**
 * The match screen: terrain, scoreboard, momentum chart, stats panel, feed and speed controls.
 * The match is created once from `input` and `seed`; give the component a new `key` to start another.
 */
export function MatchScreen({
  input,
  seed,
  colours,
  squads,
  createRenderer,
  tickMs,
  onContinue,
}: MatchScreenProps) {
  const { t, locale } = useI18n();
  const [match] = useState(() => createMatch(input, seed));
  const { matchTime, state, events, paused, speed, setPaused, setSpeed, resume } = useMatchPlayback(
    match,
    tickMs,
  );
  const stats = useMemo(() => computeMatchStats(events, matchTime), [events, matchTime]);
  const shownEvents = useMemo(() => terrainEvents(events, state.period), [events, state.period]);
  const halfTime = state.period === "halfTime";
  const names = useMemo(() => ({ home: input.home.name, away: input.away.name }), [input]);
  const lines = useMemo(
    () =>
      generateCommentary(
        events,
        { locale, names, scorers: attributeGoalScorers(events, squads, seed) },
        seed,
      ),
    [events, locale, names, squads, seed],
  );
  return (
    <div className="match-screen" data-testid="match-screen">
      <Scoreboard
        homeName={names.home}
        awayName={names.away}
        homeColour={colours.home}
        awayColour={colours.away}
        score={state.score}
        period={state.period}
        matchTime={matchTime}
        events={events}
      />
      <div className="match-main">
        <MomentumTerrain
          events={shownEvents}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
          createRenderer={createRenderer}
          label={t("match.terrain")}
        />
        {halfTime && (
          <HalfTimePanel
            homeName={names.home}
            awayName={names.away}
            score={state.score}
            stats={stats}
            onResume={resume}
          />
        )}
        {state.period === "fullTime" && onContinue && (
          <button type="button" data-testid="continue" onClick={() => onContinue(state.score)}>
            {t("match.continue")}
          </button>
        )}
        <SpeedControls
          paused={paused}
          speed={speed}
          onPausedChange={setPaused}
          onSpeedChange={setSpeed}
        />
      </div>
      <aside className="match-side">
        {!halfTime && <StatsPanel stats={stats} />}
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
