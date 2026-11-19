import { useMemo, useState } from "react";
import { generateActionCommentary } from "../../commentary";
import type {
  ActionEvent,
  ActionMatch,
  ActionMatchState,
  EngineVersion,
  MatchInput,
  PerSide,
  Side,
} from "../../engine";
import { computeActionStats, createActionMatch, playerRatings } from "../../engine";
import { type CoachedMatch, goalScorersOf, type MatchReport } from "../../game";
import { useI18n } from "../i18n-provider";
import { useSuspendPaletteShortcut } from "../palette/palette-provider";
import { ActionStatsPanel } from "./action-stats-panel";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { FullTimeReport } from "./full-time-report";
import type { HalfTimeEditor } from "./half-time-panel";
import { LineupsPanel } from "./lineups-panel";
import { MatchLayout } from "./match-layout";
import type { MatchProgress, ProgressMoment, RestoredMatch } from "./match-progress";
import { goalsOf } from "./match-result";
import { PlayerRatings } from "./player-ratings";
import { buildRatingRows } from "./ratings-table";
import { terrainEvents } from "./terrain-events";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { useMatchPlayback } from "./use-match-playback";
import { useMatchProgress } from "./use-match-progress";
import { useZoneEvents } from "./use-zone-events";

/** What `onContinue` gets at full time. */
export type FinishedMatch = {
  score: ActionMatchState["score"];
  /** Player ids of the scorers in the order the goals were scored. */
  scorers: string[];
  engineVersion: EngineVersion;
  /** Energy (0 to 100) each player who played ended the match with. */
  energy: Readonly<Record<string, number>>;
};

export type MatchScreenProps = {
  seed: number;
  input: MatchInput;
  /**
   * Creates the match, for example with AI substitutions (`createCoachedMatch`); default a plain
   * `createActionMatch(input, seed)`.
   */
  createMatch?: () => ActionMatch | CoachedMatch;
  colours: PerSide<string>;
  /** Display name of every player who can appear in the log, by player id. */
  players: Readonly<Record<string, string>>;
  /** The side the user manages; its players come first in the ratings table. Default home. */
  userSide?: Side;
  /** Replaces the three.js renderer, for tests. */
  createRenderer?: TerrainRendererFactory;
  /** Replaces the canvas 2D pitch renderer, for tests. */
  createPitchRenderer?: PitchRendererFactory;
  /** How often the clock advances, in milliseconds; tests use a coarser tick. */
  tickMs?: number;
  /** Lets the user change their side at half-time. Without it half-time offers no changes. */
  halfTimeEditor?: HalfTimeEditor;
  /**
   * When given, a "Continue" button appears at full time and calls this with the final score and
   * engine version and, if the user made changes at half-time, the report of minutes played.
   */
  onContinue?: (finished: FinishedMatch, report?: MatchReport) => void;
  /**
   * A match rebuilt from a saved session: `createMatch` returns it already advanced to the saved
   * position, and the screen shows it paused there.
   */
  restored?: RestoredMatch;
  /** Called with what is needed to resume the match: on every change and, while it runs, often. */
  onProgress?: (progress: MatchProgress, moment: ProgressMoment) => void;
  /** When given, the scoreboard has a back link to the hub that asks first and then calls this. */
  onLeave?: () => void;
};

/**
 * The match screen: terrain or 2D pitch, scoreboard, momentum chart, stats panel, feed and playback
 * mode controls. The match is created once from `input` and `seed`; give the component a new `key` to
 * start another.
 */
export function MatchScreen({
  input,
  seed,
  createMatch,
  colours,
  players,
  userSide = "home",
  createRenderer,
  createPitchRenderer,
  tickMs,
  halfTimeEditor,
  restored,
  onProgress,
  onContinue,
  onLeave,
}: MatchScreenProps) {
  const { locale } = useI18n();
  const [match] = useState(() => createMatch?.() ?? createActionMatch(input, seed));
  const {
    matchTime,
    state,
    events,
    eventCount,
    resume,
    userChanges,
    userChangeCount,
    ...playback
  } = useMatchPlayback(
    match,
    tickMs,
    restored && { matchTime: restored.matchTime, mode: restored.mode, changes: restored.changes },
  );
  // Space and the arrow keys belong to the match while it runs; Ctrl+K waits until it is paused.
  useSuspendPaletteShortcut(
    !playback.paused && (state.period === "firstHalf" || state.period === "secondHalf"),
  );
  const { report, awaitingResume, startSecondHalf, setPaused } = useMatchProgress({
    restored,
    onProgress,
    playback: { ...playback, matchTime, period: state.period, userChanges, userChangeCount },
    resume,
  });
  const zoneEvents = useZoneEvents(events, eventCount);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const actionStats = useMemo(() => computeActionStats(events, matchTime), [eventCount, matchTime]);
  const fullTime = state.period === "fullTime";
  // Starters plus everyone brought on by an applied change; read once the match is over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `match.changes` is mutated in place
  const played = useMemo(() => playedIds(input, match.changes), [input, state.period]);
  const ratingRows = useFinalRatings({ events, fullTime, played, players, userSide });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` is appended to in place and only read at full time
  const goals = useMemo(
    () => (fullTime ? goalsOf(events, zoneEvents, players) : []),
    [fullTime, zoneEvents, players],
  );
  const shown = useMemo(() => terrainEvents(zoneEvents, state.period), [zoneEvents, state.period]);
  const names = useMemo(() => ({ home: input.home.name, away: input.away.name }), [input]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const lines = useMemo(
    () => generateActionCommentary(events.slice(0, eventCount), { locale, names, players }, seed),
    [eventCount, locale, names, players, seed],
  );
  return (
    <MatchLayout
      names={names}
      colours={colours}
      score={state.score}
      period={state.period}
      matchTime={matchTime}
      events={zoneEvents}
      terrainEvents={shown}
      stats={actionStats}
      playerIds={played}
      lines={lines}
      playback={{ ...playback, setPaused }}
      awaitingResume={awaitingResume}
      createRenderer={createRenderer}
      pitch={{ events, createRenderer: createPitchRenderer }}
      halfTimeEditor={halfTimeEditor}
      statsPanel={<ActionStatsPanel stats={actionStats} playerIds={played} colours={colours} />}
      lineupsPanel={
        <LineupsPanel
          events={events}
          eventCount={eventCount}
          matchTime={matchTime}
          played={played}
          names={players}
          teamNames={names}
          colours={colours}
          userSide={userSide}
        />
      }
      onLeave={onLeave}
      fullTimePanel={
        <FullTimeReport
          names={names}
          colours={colours}
          score={state.score}
          userSide={userSide}
          goals={goals}
        >
          <PlayerRatings rows={ratingRows} teamNames={names} />
        </FullTimeReport>
      }
      onResume={startSecondHalf}
      onContinue={
        onContinue &&
        (() =>
          onContinue(
            {
              score: state.score,
              scorers: goalScorersOf(events),
              engineVersion: input.engineVersion,
              energy: match.state.energy,
            },
            withOpponent(report, match, userSide),
          ))
      }
    />
  );
}

/** The user's report with what the AI opponent played; the user's report is absent when nothing was changed. */
const withOpponent = (
  report: MatchReport | undefined,
  match: ActionMatch | CoachedMatch,
  userSide: Side,
): MatchReport | undefined => {
  if (!report || !("aiReports" in match)) return report;
  return { ...report, opponent: match.aiReports()[userSide === "home" ? "away" : "home"] };
};

/** Ids of the players who played, per side: the starters and everyone a change brought on. */
const playedIds = (
  input: MatchInput,
  changes: readonly { change: { side: Side; lineup?: readonly { id: string }[] } }[],
): PerSide<string[]> => {
  const played: PerSide<Set<string>> = {
    home: new Set(input.home.starters.map((p) => p.id)),
    away: new Set(input.away.starters.map((p) => p.id)),
  };
  for (const { change } of changes) {
    for (const player of change.lineup ?? []) played[change.side].add(player.id);
  }
  return { home: [...played.home], away: [...played.away] };
};

type FinalRatingsInput = {
  events: readonly ActionEvent[];
  fullTime: boolean;
  played: PerSide<string[]>;
  players: Readonly<Record<string, string>>;
  userSide: Side;
};

/** The full-time rating rows; empty until the match is over. */
const useFinalRatings = ({ events, fullTime, played, players, userSide }: FinalRatingsInput) =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` is appended to in place and only read at full time
  useMemo(
    () =>
      fullTime
        ? buildRatingRows({
            players: computeActionStats(events, Number.POSITIVE_INFINITY).players,
            ratings: playerRatings(
              events,
              [...played.home, ...played.away].map((id) => ({ id })),
            ),
            played,
            names: players,
            userSide,
          })
        : [],
    [fullTime, played, players, userSide],
  );
