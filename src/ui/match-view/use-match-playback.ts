import { useEffect, useRef, useState } from "react";
import type { ActionMatch, ActionMatchChange, Match, MatchChange, Period } from "../../engine";
import { advanceClock, SPEEDS } from "./playback";

const DEFAULT_TICK_MS = 100;

/** The zone engine's match or the action engine's: both are driven the same way. */
export type PlayableMatch = Match | ActionMatch;

type ChangeOf<M extends PlayableMatch> = M extends Match ? MatchChange : ActionMatchChange;

export type MatchPlayback<M extends PlayableMatch> = {
  matchTime: number;
  state: M["state"];
  /** The whole log so far. The array is appended to in place: use `eventCount` to see that it grew. */
  events: readonly M["events"][number][];
  eventCount: number;
  paused: boolean;
  speed: number;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  /** Starts the second half, applying the user's change first; only valid at half-time. */
  resume: (change?: ChangeOf<M>) => void;
};

const isPlaying = (period: Period): boolean => period === "firstHalf" || period === "secondHalf";

/**
 * Drives a match from the wall clock: advances the simulation while playing, and stops on its own
 * at half-time and full time, where the engine holds the match until it is resumed. The hook keeps
 * the full event list and only appends the events of each tick, so a tick costs what is new.
 */
export const useMatchPlayback = <M extends PlayableMatch>(
  match: M,
  tickMs: number = DEFAULT_TICK_MS,
): MatchPlayback<M> => {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[1]);
  const [matchTime, setMatchTime] = useState(0);
  const eventsRef = useRef<M["events"][number][]>([...match.events]);
  const [snapshot, setSnapshot] = useState(() => ({
    state: match.state,
    eventCount: eventsRef.current.length,
  }));
  const timeRef = useRef(0);

  const publish = () => {
    eventsRef.current.push(...match.events.slice(eventsRef.current.length));
    setSnapshot({ state: match.state, eventCount: eventsRef.current.length });
  };

  // `publish` only reads refs and the match, so it is not a dependency.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const wallSeconds = (now - last) / 1000;
      last = now;
      if (paused || !isPlaying(match.state.period)) return;
      match.advanceTo(advanceClock(timeRef.current, wallSeconds, speed, paused));
      timeRef.current = match.state.time;
      setMatchTime(timeRef.current);
      publish();
    }, tickMs);
    return () => clearInterval(id);
  }, [match, speed, paused, tickMs]);

  const resume = (change?: ChangeOf<M>) => {
    if (match.state.period !== "halfTime") return;
    if (change) (match.applyChange as (change: ChangeOf<M>) => unknown)(change);
    match.resume();
    publish();
  };

  return {
    matchTime,
    state: snapshot.state,
    events: eventsRef.current,
    eventCount: snapshot.eventCount,
    paused,
    speed,
    setPaused,
    setSpeed,
    resume,
  };
};
