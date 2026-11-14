import { useMemo, useState } from "react";
import { generateActionCommentary, generateCommentary } from "../../commentary";
import type { EngineVersion, MatchInputV1, MatchInputV2, MatchState, PerSide } from "../../engine";
import { computeMatchStats, createMatch, toZoneEvents } from "../../engine";
import type { MatchReport, SquadPlayer } from "../../game";
import { attributeGoalScorers } from "../../game";
import { useI18n } from "../i18n-provider";
import type { AppliedHalfTimePlan, HalfTimeEditor } from "./half-time-panel";
import { MatchLayout } from "./match-layout";
import { terrainEvents } from "./terrain-events";
import type { TerrainRendererFactory } from "./terrain-renderer";
import { useMatchPlayback } from "./use-match-playback";

/** What `onContinue` gets at full time. */
export type FinishedMatch = {
  score: MatchState["score"];
  engineVersion: EngineVersion;
};

type MatchScreenCommon = {
  seed: number;
  colours: PerSide<string>;
  /** The players goals are credited to, by position and finishing (zone engine). */
  squads: PerSide<readonly SquadPlayer[]>;
  /** Replaces the three.js renderer, for tests. */
  createRenderer?: TerrainRendererFactory;
  /** How often the clock advances, in milliseconds; tests use a coarser tick. */
  tickMs?: number;
  /** Lets the user change their side at half-time. Without it half-time offers no changes. */
  halfTimeEditor?: HalfTimeEditor;
  /**
   * When given, a "Continue" button appears at full time and calls this with the final score and
   * engine version and, if the user made changes at half-time, the report of minutes played.
   */
  onContinue?: (finished: FinishedMatch, report?: MatchReport) => void;
};

export type MatchScreenProps = MatchScreenCommon &
  (
    | { engineVersion?: 1; input: MatchInputV1 }
    | {
        engineVersion: 2;
        input: MatchInputV2;
        /** Display name of every player who can appear in the log, by player id. */
        players: Readonly<Record<string, string>>;
      }
  );

type ZoneProps = MatchScreenCommon & { input: MatchInputV1 };
type ActionProps = MatchScreenCommon & {
  input: MatchInputV2;
  players: Readonly<Record<string, string>>;
};

/**
 * The match screen: terrain, scoreboard, momentum chart, stats panel, feed and speed controls.
 * The match is created once from `input` and `seed` on the engine the setup names (the zone engine
 * unless `engineVersion` is 2); give the component a new `key` to start another.
 */
export function MatchScreen(props: MatchScreenProps) {
  return props.engineVersion === 2 ? (
    <ActionMatchScreen {...props} />
  ) : (
    <ZoneMatchScreen {...props} />
  );
}

function ZoneMatchScreen({
  input,
  seed,
  colours,
  squads,
  createRenderer,
  tickMs,
  halfTimeEditor,
  onContinue,
}: ZoneProps) {
  const { locale } = useI18n();
  const [match] = useState(() => createMatch(input, seed));
  const { matchTime, state, events, eventCount, resume, ...playback } = useMatchPlayback(
    match,
    tickMs,
  );
  const [report, setReport] = useState<MatchReport | undefined>();
  const startSecondHalf = (plan?: AppliedHalfTimePlan) => {
    setReport(plan?.report);
    resume(plan?.engineVersion === 1 ? plan.change : undefined);
  };
  // `events` is appended to in place; `eventCount` tells when it grew.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const stats = useMemo(() => computeMatchStats(events, matchTime), [eventCount, matchTime]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const shown = useMemo(() => terrainEvents(events, state.period), [eventCount, state.period]);
  const names = useMemo(() => ({ home: input.home.name, away: input.away.name }), [input]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const lines = useMemo(
    () =>
      generateCommentary(
        events,
        { locale, names, scorers: attributeGoalScorers(events, squads, seed) },
        seed,
      ),
    [eventCount, locale, names, squads, seed],
  );
  return (
    <MatchLayout
      names={names}
      colours={colours}
      score={state.score}
      period={state.period}
      matchTime={matchTime}
      events={events}
      terrainEvents={shown}
      stats={stats}
      lines={lines}
      playback={playback}
      createRenderer={createRenderer}
      halfTimeEditor={halfTimeEditor}
      onResume={startSecondHalf}
      onContinue={
        onContinue && (() => onContinue({ score: state.score, engineVersion: 1 }, report))
      }
    />
  );
}

function ActionMatchScreen({
  input,
  seed,
  colours,
  players,
  createRenderer,
  tickMs,
  halfTimeEditor,
  onContinue,
}: ActionProps) {
  const { locale } = useI18n();
  const [match] = useState(() => createMatch(input, seed));
  const { matchTime, state, events, eventCount, resume, ...playback } = useMatchPlayback(
    match,
    tickMs,
  );
  const [report, setReport] = useState<MatchReport | undefined>();
  const startSecondHalf = (plan?: AppliedHalfTimePlan) => {
    setReport(plan?.report);
    resume(plan?.engineVersion === 2 ? plan.change : undefined);
  };
  // The terrain, the momentum chart and the stats only ever see the adapted events.
  // `events` is appended to in place; `eventCount` tells when it grew.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const zoneEvents = useMemo(() => toZoneEvents(events), [eventCount]);
  const stats = useMemo(() => computeMatchStats(zoneEvents, matchTime), [zoneEvents, matchTime]);
  const shown = useMemo(() => terrainEvents(zoneEvents, state.period), [zoneEvents, state.period]);
  const names = useMemo(() => ({ home: input.home.name, away: input.away.name }), [input]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const lines = useMemo(
    () => generateActionCommentary(events, { locale, names, players }, seed),
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
      stats={stats}
      lines={lines}
      playback={playback}
      createRenderer={createRenderer}
      halfTimeEditor={halfTimeEditor}
      onResume={startSecondHalf}
      onContinue={
        onContinue && (() => onContinue({ score: state.score, engineVersion: 2 }, report))
      }
    />
  );
}
