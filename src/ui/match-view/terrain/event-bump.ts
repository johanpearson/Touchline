import type { MatchEvent } from "../../../engine";
import { attackProgress } from "./attack-progress";
import type { Bump } from "./terrain-field";

/** Pressure bumps an event adds to the terrain. Tuning values come from the prototype. */
export const bumpsForEvent = (event: MatchEvent): Bump[] => {
  const { team, position } = event;
  const { x, y } = position;
  const progress = attackProgress(team, x);
  const at = (amplitude: number, sigma: number): Bump => ({ side: team, x, y, amplitude, sigma });

  switch (event.type) {
    case "progress":
      return [at(0.18 + progress * progress * 0.75, 0.09 + (1 - progress) * 0.06)];
    case "lateral":
      return [at(0.1 + progress * progress * 0.35, 0.1)];
    case "turnover":
      return [at(0.2, 0.08)];
    case "shot":
      return [at(0.6 + event.xg * 2, 0.045)];
    case "goal":
      return [at(1.2, 0.05)];
    case "corner":
      return [at(0.45, 0.06)];
    case "foul":
      return [at(0.1, 0.1)];
    case "kickoff":
    case "periodChange":
      return [];
  }
};
