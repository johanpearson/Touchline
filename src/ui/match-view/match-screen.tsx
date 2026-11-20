import { type ComponentProps, useMemo, useState } from "react";
import type { CommentaryLine } from "../../commentary";
import { generateActionCommentary } from "../../commentary";
import type {
  ActionEvent,
  ActionMatch,
  ActionMatchState,
  MatchInput,
  PerSide,
  Side,
  TimedActionMatchChange,
} from "../../engine";
import { computeActionStats, createActionMatch, playerRatings } from "../../engine";
import type { CoachedMatch, MatchEdit, MatchReport } from "../../game";
import { useI18n } from "../i18n-provider";
import { useSuspendPaletteShortcut } from "../palette/palette-provider";
import { ActionStatsPanel } from "./action-stats-panel";
import { changeLines } from "./change-lines";
import type { PitchRendererFactory } from "./classic-pitch-renderer";
import { type FinishedMatch, finishedMatchOf, withOpponent } from "./finish-match";
import { FullTimeReport } from "./full-time-report";
import type { ChangesSource } from "./half-time-model";
import { LeaveMatchPrompt } from "./leave-match-dialog";
import { LineupsPanel } from "./lineups-panel";
import { MatchLayout } from "./match-layout";
import type { MatchProgress, ProgressMoment, RestoredMatch } from "./match-progress";
import { goalsOf } from "./match-result";
import { PlayerRatings } from "./player-ratings";
import { buildRatingRows } from "./ratings-table";
import { terrainEvents } from "./terrain-events";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { useMatchChanges } from "./use-match-changes";
import { useMatchLeave } from "./use-match-leave";
import { useMatchPlayback } from "./use-match-playback";
import { useMatchProgress } from "./use-match-progress";
import { useZoneEvents } from "./use-zone-events";

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
  /**
   * Lets the user change their side at half-time and whenever the match is paused: who is on the
   * pitch after the changes so far, and how a change is validated. Without it no changes are offered.
   */
  changesSource?: ChangesSource;
  /**
   * When given, a "Continue" button appears at full time and calls this with the final score and
   * engine version and, if the user made changes, the report of minutes played.
   */
  onContinue?: (finished: FinishedMatch, report?: MatchReport) => void;
  /**
   * A match rebuilt from a saved session: `createMatch` returns it already advanced to the saved
   * position, and the screen shows it paused there.
   */
  restored?: RestoredMatch;
  /** Called with what is needed to resume the match: on every change and, while it runs, often. */
  onProgress?: (progress: MatchProgress, moment: ProgressMoment) => void;
  /** When given, the scoreboard has a back link to the hub; the screen asks before it leaves a match in progress. */
  onLeave?: () => void;
  /**
   * When given, the screen holds the user on a match in progress: navigating elsewhere asks first,
   * and "Simulate the rest now" calls this with what is needed to play the match to its end and the
   * hash the user wanted to go to. The owner records the result and goes there.
   */
  onSimulateRest?: (rest: SimulatedRest, destination: string) => void;
};

/** What a match screen hands over when the user lets the rest of the match be simulated. */
export type SimulatedRest = {
  /** The user's changes with the engine time they were applied at. */
  changes: readonly TimedActionMatchChange[];
  /** The report of minutes when the user made changes. */
  report?: MatchReport;
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
  changesSource,
  restored,
  onProgress,
  onContinue,
  onLeave,
  onSimulateRest,
}: MatchScreenProps) {
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
  const { zoneEvents, actionStats, shown, names, commentary, played, ratingRows, goals } =
    useMatchViewData({
      input,
      seed,
      match,
      players,
      userSide,
      events,
      eventCount,
      matchTime,
      period: state.period,
    });
  const { editor, edits, report, apply, startSecondHalf } = useMatchChanges({
    source: changesSource,
    restored,
    match,
    zoneEvents,
    matchTime,
    period: state.period,
    playback: { applyChange: playback.applyChange, resume },
  });
  const { awaitingResume, setPaused } = useMatchProgress({
    restored,
    edits,
    report,
    onProgress,
    playback: { ...playback, matchTime, period: state.period, userChanges, userChangeCount },
  });
  const { locale, t } = useI18n();
  const lines = useChangeLines({ commentary, edits, players, userSide, input, t, locale });
  const active = state.period !== "fullTime" && onSimulateRest !== undefined;
  const leave = useMatchLeave({ active, paused: playback.paused, setPaused });
  return (
    <>
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
        editor={editor}
        onChange={apply}
        changeTimes={edits.map((edit) => edit.time)}
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
          <FullTimePanel
            report={{ names, colours, score: state.score, userSide, goals }}
            rows={ratingRows}
          />
        }
        onResume={startSecondHalf}
        onContinue={
          onContinue &&
          (() =>
            onContinue(
              finishedMatchOf(match, input.engineVersion),
              withOpponent(report, match, userSide),
            ))
        }
      />
      <LeaveMatchPrompt
        target={leave.target}
        names={names}
        score={state.score}
        matchTime={matchTime}
        events={zoneEvents}
        onStay={leave.stay}
        onSimulate={(destination) =>
          onSimulateRest?.({ changes: userChanges, report }, destination)
        }
      />
    </>
  );
}

type ChangeLinesInput = {
  commentary: readonly CommentaryLine[];
  edits: readonly MatchEdit[];
  players: Readonly<Record<string, string>>;
  userSide: Side;
  input: MatchInput;
  t: ReturnType<typeof useI18n>["t"];
  locale: string;
};

/** The commentary with a line for each change the user made, in match order. */
const useChangeLines = ({
  commentary,
  edits,
  players,
  userSide,
  input,
  t,
  locale,
}: ChangeLinesInput) =>
  // biome-ignore lint/correctness/useExhaustiveDependencies: `t` follows `locale`
  useMemo(() => {
    if (edits.length === 0) return commentary;
    const own = changeLines(edits, {
      t,
      names: players,
      side: userSide,
      startTactics: input[userSide].tactics,
    });
    // Sorting is stable: a change goes after the commentary of the same moment.
    return [...commentary, ...own].sort((a, b) => a.time - b.time);
  }, [commentary, edits, players, userSide, input, locale]);

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

type FullTimePanelProps = {
  report: Omit<ComponentProps<typeof FullTimeReport>, "children">;
  rows: ComponentProps<typeof PlayerRatings>["rows"];
};

/** The full-time report with the player ratings under it. */
const FullTimePanel = ({ report, rows }: FullTimePanelProps) => (
  <FullTimeReport {...report}>
    <PlayerRatings rows={rows} teamNames={report.names} />
  </FullTimeReport>
);

type MatchViewDataInput = {
  input: MatchInput;
  seed: number;
  match: ActionMatch;
  players: Readonly<Record<string, string>>;
  userSide: Side;
  events: readonly ActionEvent[];
  eventCount: number;
  matchTime: number;
  period: ActionMatchState["period"];
};

/** Everything the match layout shows that is derived from the event log, memoised on what changes it. */
const useMatchViewData = (data: MatchViewDataInput) => {
  const { input, seed, match, players, userSide, events, eventCount, matchTime, period } = data;
  const { locale } = useI18n();
  const zoneEvents = useZoneEvents(events, eventCount);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` is appended to in place
  const actionStats = useMemo(() => computeActionStats(events, matchTime), [eventCount, matchTime]);
  const full = useFullTimeData({
    input,
    match,
    events,
    zoneEvents,
    period,
    players,
    userSide,
  });
  const shown = useMemo(() => terrainEvents(zoneEvents, period), [zoneEvents, period]);
  const names = useMemo(() => ({ home: input.home.name, away: input.away.name }), [input]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` is appended to in place
  const commentary = useMemo(
    () => generateActionCommentary(events.slice(0, eventCount), { locale, names, players }, seed),
    [eventCount, locale, names, players, seed],
  );
  return { zoneEvents, actionStats, shown, names, commentary, ...full };
};

type FullTimeDataInput = {
  input: MatchInput;
  match: ActionMatch;
  events: readonly ActionEvent[];
  zoneEvents: Parameters<typeof goalsOf>[1];
  period: ActionMatchState["period"];
  players: Readonly<Record<string, string>>;
  userSide: Side;
};

/** Who played, the rating rows and the goals; the last two are empty until the match is over. */
const useFullTimeData = ({
  input,
  match,
  events,
  zoneEvents,
  period,
  players,
  userSide,
}: FullTimeDataInput) => {
  const fullTime = period === "fullTime";
  // Starters plus everyone brought on by an applied change; read once the match is over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `match.changes` is mutated in place
  const played = useMemo(() => playedIds(input, match.changes), [input, period]);
  const ratingRows = useFinalRatings({ events, fullTime, played, players, userSide });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` is appended to in place and only read at full time
  const goals = useMemo(
    () => (fullTime ? goalsOf(events, zoneEvents, players) : []),
    [fullTime, zoneEvents, players],
  );
  return { played, ratingRows, goals };
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
