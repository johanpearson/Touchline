import { useEffect, useRef, useState } from "react";
import type { Match, MatchChange, MatchEvent, MatchState } from "../../engine";
import { advanceClock, SPEEDS } from "./playback";

const DEFAULT_TICK_MS = 100;

export type MatchPlayback = {
  matchTime: number;
  state: MatchState;
  events: readonly MatchEvent[];
  paused: boolean;
  speed: number;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  /** Starts the second half, applying the user's change first; only valid at half-time. */
  resume: (change?: MatchChange) => void;
};

/**
 * Drives a match from the wall clock: advances the simulation while playing, and stops on its own
 * at half-time and full time, where the engine holds the match until it is resumed.
 */
export const useMatchPlayback = (match: Match, tickMs: number = DEFAULT_TICK_MS): MatchPlayback => {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEEDS[1]);
  const [matchTime, setMatchTime] = useState(0);
  const [snapshot, setSnapshot] = useState(() => ({
    state: match.state,
    events: [...match.events],
  }));
  const timeRef = useRef(0);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const wallSeconds = (now - last) / 1000;
      last = now;
      const playing = match.state.period === "firstHalf" || match.state.period === "secondHalf";
      if (paused || !playing) return;
      match.advanceTo(advanceClock(timeRef.current, wallSeconds, speed, paused));
      timeRef.current = match.state.time;
      setMatchTime(timeRef.current);
      setSnapshot({ state: match.state, events: [...match.events] });
    }, tickMs);
    return () => clearInterval(id);
  }, [match, speed, paused, tickMs]);

  const resume = (change?: MatchChange) => {
    if (match.state.period !== "halfTime") return;
    if (change) match.applyChange(change);
    match.resume();
    setSnapshot({ state: match.state, events: [...match.events] });
  };

  return { matchTime, ...snapshot, paused, speed, setPaused, setSpeed, resume };
};
