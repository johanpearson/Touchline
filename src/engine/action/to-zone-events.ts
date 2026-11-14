import type { MatchEvent, ShotOutcome } from "../match-event";
import type { Side } from "../match-state";
import { clamp, progressOf } from "../pitch";
import type { ActionEvent, ShotEvent } from "./action-event";
import { holderAfter } from "./action-stats";
import { type Point, toNormalised } from "./pitch-metres";

/** A completed pass, carry or clearance that advances the ball this far towards goal counts as progress. */
export const FORWARD_MINIMUM_METRES = 3;

/** Same bump heights as the zone engine, so the terrain and the momentum chart look the same for both. */
const INTENSITY = { lateral: 0.1, turnover: 0.2, corner: 0.45, kickoff: 0.3, goal: 1 } as const;

const progressIntensity = (progress: number): number =>
  clamp(0.18 + progress * progress * 0.75, 0, 1);
const shotIntensity = (xg: number): number => clamp(0.6 + xg * 2, 0, 1);

/** The zone engine has no woodwork outcome; a shot that hits the frame is a miss. */
const shotOutcome = (outcome: ShotEvent["outcome"]): ShotOutcome =>
  outcome === "woodwork" ? "missed" : outcome;

const movedForward = (event: ActionEvent): boolean => {
  const towardsGoal = event.team === "home" ? 1 : -1;
  return (event.to.x - event.from.x) * towardsGoal >= FORWARD_MINIMUM_METRES;
};

type Placed = { time: number; team: Side };

const shotEvents = (event: ShotEvent, at: Placed, position: Point): MatchEvent[] => {
  const base = { ...at, position: toNormalised(position) };
  const shot: MatchEvent = {
    ...base,
    type: "shot",
    xg: event.xg,
    outcome: shotOutcome(event.outcome),
    intensity: shotIntensity(event.xg),
  };
  if (event.outcome !== "goal") return [shot];
  return [shot, { ...base, type: "goal", xg: event.xg, intensity: INTENSITY.goal }];
};

/** What the ball does once `event` is over, when the event is not one the zone engine names itself. */
const flowEvent = (event: ActionEvent, team: Side, changedHands: boolean): MatchEvent => {
  const position = toNormalised(event.to);
  const base = { time: event.time, team, position };
  if (changedHands) return { ...base, type: "turnover", intensity: INTENSITY.turnover };
  if (movedForward(event)) {
    return {
      ...base,
      type: "progress",
      intensity: progressIntensity(progressOf(team, position.x)),
    };
  }
  return { ...base, type: "lateral", intensity: INTENSITY.lateral };
};

const convert = (event: ActionEvent, previousHolder: Side | undefined): MatchEvent[] => {
  const team = holderAfter(event);
  const at = { time: event.time, team: event.team };
  const position = toNormalised(event.to);
  switch (event.type) {
    case "shot":
      return shotEvents(event, at, event.from);
    case "foul":
      return [{ ...at, type: "foul", position, intensity: INTENSITY.lateral }];
    case "periodChange":
      return [{ ...at, type: "periodChange", period: event.period, position, intensity: 0 }];
    case "setPiece":
      if (event.variant === "kickoff") {
        return [{ ...at, type: "kickoff", position, intensity: INTENSITY.kickoff }];
      }
      if (event.variant === "corner") {
        return [{ ...at, type: "corner", position, intensity: INTENSITY.corner }];
      }
      return [flowEvent(event, team, previousHolder !== undefined && previousHolder !== team)];
    default:
      return [flowEvent(event, team, previousHolder !== undefined && previousHolder !== team)];
  }
};

/**
 * Maps an action-engine log to zone-engine events so the momentum terrain, the momentum chart and
 * the possession and field-tilt stats keep working unchanged. Pure; the output has the same order
 * and times as the input.
 *
 * - Shots, fouls, kickoffs, corners and period changes map one to one (a goal is a `shot` plus a
 *   `goal`, as in the zone engine; woodwork is a miss). A shot sits where it was taken.
 * - Every other action (and the throw-in, goal kick, free kick and penalty restarts) is a
 *   `turnover` when the ball changes hands, otherwise `progress` when it moved at least
 *   `FORWARD_MINIMUM_METRES` towards the goal the side attacks, otherwise `lateral`.
 * - `team` is the side that has the ball afterwards, the position is where the ball ends up
 *   (metres to 0..1), and the intensity uses the zone engine's formulas.
 */
export const toZoneEvents = (events: readonly ActionEvent[]): MatchEvent[] => {
  const zone: MatchEvent[] = [];
  let holder: Side | undefined;
  for (const event of events) {
    zone.push(...convert(event, holder));
    holder = holderAfter(event);
  }
  return zone;
};
