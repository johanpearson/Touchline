import { useEffect, useRef, useState } from "react";
import type { Side } from "../../engine";

/** How long a goal stays highlighted on the scoreboard, in milliseconds. */
export const GOAL_HIGHLIGHT_MS = 4000;

type Score = { home: number; away: number };

export type GoalHighlight = { side: Side; score: Score };

/** The side that just scored, for `GOAL_HIGHLIGHT_MS` after the score changed; undefined otherwise. */
export const useGoalHighlight = (score: Score): GoalHighlight | undefined => {
  const previous = useRef(score);
  const [highlight, setHighlight] = useState<GoalHighlight>();
  const { home, away } = score;
  useEffect(() => {
    const before = previous.current;
    previous.current = { home, away };
    if (home <= before.home && away <= before.away) return;
    setHighlight({ side: home > before.home ? "home" : "away", score: { home, away } });
    const id = setTimeout(() => setHighlight(undefined), GOAL_HIGHLIGHT_MS);
    return () => clearTimeout(id);
  }, [home, away]);
  return highlight;
};
