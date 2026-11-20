import { useRef, useState } from "react";
import { useLockMatch } from "../match-lock/match-lock";
import { useNavigationGuard } from "../use-navigation-guard";

type Input = {
  /** The match is on screen and not over. */
  active: boolean;
  paused: boolean;
  setPaused: (paused: boolean) => void;
};

/**
 * Holds the user on the match: locks the career to the match screen and turns every other
 * navigation into a question. The match is paused while the question is open and goes on from the
 * same minute on "Stay" if it was playing.
 */
export function useMatchLeave({ active, paused, setPaused }: Input) {
  const [target, setTarget] = useState<string | null>(null);
  const wasPlaying = useRef(false);
  useLockMatch(active);
  useNavigationGuard(active, (hash) => {
    if (target === null) wasPlaying.current = !paused;
    setPaused(true);
    setTarget(hash);
  });
  const stay = () => {
    setTarget(null);
    if (wasPlaying.current) setPaused(false);
    wasPlaying.current = false;
  };
  return { target, stay };
}
