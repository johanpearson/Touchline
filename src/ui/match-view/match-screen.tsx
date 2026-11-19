import { useMemo, useRef, useState } from "react";
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
import {
  computeActionStats,
  createActionMatch,
  createZoneEventAdapter,
  playerRatings,
  type ZoneEvent,
} from "../../engine";
import { type CoachedMatch, goalScorersOf, type MatchReport } from "../../game";
import { useI18n } from "../i18n-provider";
import { useSuspendPaletteShortcut } from "../palette/palette-provider";
import { ActionStatsPanel } from "./action-stats-panel";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { FullTimeReport } from "./full-time-report";
import type { AppliedHalfTimePlan, HalfTimeEditor } from "./half-time-panel";
import { LineupsPanel } from "./lineups-panel";
import { MatchLayout } from "./match-layout";
import { goalsOf } from "./match-result";
import { PlayerRatings } from "./player-ratings";
import { buildRatingRows } from "./ratings-table";
import { terrainEvents } from "./terrain-events";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { useMatchPlayback } from "./use-match-playback";

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
  onContinue,
  onLeave,
}: MatchScreenProps) {
  const { locale } = useI18n();
  const [match] = useState(() => createMatch?.() ?? createActionMatch(input, seed));
  const { matchTime, state, events, eventCount, resume, ...playback } = useMatchPlayback(
    match,
    tickMs,
  );
  // Space and the arrow keys belong to the match while it runs; Ctrl+K waits until it is paused.
  useSuspendPaletteShortcut(
    !playback.paused && (state.period === "firstHalf" || state.period === "secondHalf"),
  );
  const [report, setReport] = useState<MatchReport | undefined>();
  const startSecondHalf = (plan?: AppliedHalfTimePlan) => {
    setReport(plan?.report);
    resume(plan?.change);
  };
  // The terrain, the momentum chart and the stats only ever see the adapted events.
  // `events` is appended to in place; `eventCount` tells when it grew, so only the new tail is
  // adapted and appended to one growing zone-event list.
  const adapted = useRef<
    | {
        adapter: ReturnType<typeof createZoneEventAdapter>;
        consumed: number;
        zone: ZoneEvent[];
      }
    | undefined
  >(undefined);
  adapted.current ??= { adapter: createZoneEventAdapter(), consumed: 0, zone: [] };
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const zoneEvents = useMemo(() => {
    const kept = adapted.current;
    if (!kept) return [];
    kept.zone.push(...kept.adapter.push(events.slice(kept.consumed, eventCount)));
    kept.consumed = eventCount;
    // A cheap copy of references, so memoised children see a new array when the log grew.
    return kept.zone.slice();
  }, [eventCount]);
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
      playback={playback}
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
              energy: state.energy,
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
