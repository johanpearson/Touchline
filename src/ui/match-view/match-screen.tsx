import { useMemo, useState } from "react";
import { generateCommentary } from "../../commentary";
import type { MatchInput, PerSide } from "../../engine";
import { computeMatchStats, createMatch } from "../../engine";
import { useI18n } from "../i18n-provider";
import { MatchFeed } from "./match-feed";
import { MomentumChart } from "./momentum-chart";
import { MomentumTerrain } from "./momentum-terrain";
import { Scoreboard } from "./scoreboard";
import { SpeedControls } from "./speed-controls";
import { StatsPanel } from "./stats-panel";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { useMatchPlayback } from "./use-match-playback";
import "./match-screen.css";

export type MatchScreenProps = {
  input: MatchInput;
  seed: number;
  colours: PerSide<string>;
  /** Names the commentary draws goal scorers from. */
  players: PerSide<readonly string[]>;
  /** Replaces the three.js renderer, for tests. */
  createRenderer?: TerrainRendererFactory;
  /** How often the clock advances, in milliseconds; tests use a coarser tick. */
  tickMs?: number;
};

/**
 * The match screen: terrain, scoreboard, momentum chart, stats panel, feed and speed controls.
 * The match is created once from `input` and `seed`; give the component a new `key` to start another.
 */
export function MatchScreen({
  input,
  seed,
  colours,
  players,
  createRenderer,
  tickMs,
}: MatchScreenProps) {
  const { t, locale } = useI18n();
  const [match] = useState(() => createMatch(input, seed));
  const { matchTime, state, events, paused, speed, setPaused, setSpeed } = useMatchPlayback(
    match,
    tickMs,
  );
  const stats = useMemo(() => computeMatchStats(events, matchTime), [events, matchTime]);
  const names = useMemo(() => ({ home: input.home.name, away: input.away.name }), [input]);
  const lines = useMemo(
    () => generateCommentary(events, { locale, names, players }, seed),
    [events, locale, names, players, seed],
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
          events={events}
          matchTime={matchTime}
          homeColour={colours.home}
          awayColour={colours.away}
          createRenderer={createRenderer}
          label={t("match.terrain")}
        />
        <SpeedControls
          paused={paused}
          speed={speed}
          onPausedChange={setPaused}
          onSpeedChange={setSpeed}
        />
      </div>
      <aside className="match-side">
        <StatsPanel stats={stats} />
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
