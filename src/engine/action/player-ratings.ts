import type { ActionEvent } from "./action-event";
import type { EnginePlayer } from "./engine-player";
import { leadsToShot } from "./mark-key-passes";
import {
  BIG_CHANCE_XG,
  FOUL_PENALTY,
  GOAL_BONUS,
  GOAL_CONCEDED_PENALTY,
  INTERCEPTION_BONUS,
  KEY_PASS_BONUS,
  LOST_DUEL_PENALTY,
  MISSED_CHANCE_PENALTY,
  PROGRESSIVE_PASS_BONUS,
  PROGRESSIVE_PASS_METRES,
  RATING_BASELINE,
  RATING_MAX,
  RATING_MIN,
  SAVE_BONUS,
  TACKLE_WON_BONUS,
} from "./rating-constants";

/** A player to rate; only the id is read (the keeper of each shot is named in the log). */
export type RatedPlayer = Pick<EnginePlayer, "id">;

const forwardMetres = (event: ActionEvent): number =>
  (event.to.x - event.from.x) * (event.team === "home" ? 1 : -1);

/** Rating change caused by one event, as a list of `[playerId, delta]`. */
const effectsOf = (event: ActionEvent, next: ActionEvent | undefined): [string, number][] => {
  switch (event.type) {
    case "pass": {
      const effects: [string, number][] = [];
      if (leadsToShot(event, next)) effects.push([event.actor, KEY_PASS_BONUS]);
      if (event.outcome === "complete" && forwardMetres(event) >= PROGRESSIVE_PASS_METRES) {
        effects.push([event.actor, PROGRESSIVE_PASS_BONUS]);
      }
      return effects;
    }
    case "carry":
      return event.outcome === "tackled" ? [[event.actor, -LOST_DUEL_PENALTY]] : [];
    case "tackle":
      return event.outcome === "won"
        ? [[event.actor, TACKLE_WON_BONUS]]
        : [[event.actor, -LOST_DUEL_PENALTY]];
    case "interception":
      return [[event.actor, INTERCEPTION_BONUS]];
    case "foul":
      return event.opponent === undefined ? [] : [[event.opponent, -FOUL_PENALTY]];
    case "shot":
      return shotEffects(event);
    default:
      return [];
  }
};

const shotEffects = (event: Extract<ActionEvent, { type: "shot" }>): [string, number][] => {
  const effects: [string, number][] = [];
  if (event.outcome === "goal") {
    effects.push([event.actor, GOAL_BONUS]);
    if (event.opponent !== undefined) effects.push([event.opponent, -GOAL_CONCEDED_PENALTY]);
  } else if (event.xg >= BIG_CHANCE_XG) effects.push([event.actor, -MISSED_CHANCE_PENALTY]);
  if (event.outcome === "saved" && event.opponent !== undefined) {
    effects.push([event.opponent, SAVE_BONUS]);
  }
  return effects;
};

const clamp = (value: number): number => Math.min(RATING_MAX, Math.max(RATING_MIN, value));

/**
 * A 1 to 10 rating per player id, from a 6.0 baseline. Goals, key passes, progressive completed
 * passes, tackles won, interceptions and saves raise it; lost duels, missed big chances and fouls
 * lower it; the keeper of a shot gains for a save and loses for a goal conceded. Deterministic, pure.
 */
export const playerRatings = (
  events: readonly ActionEvent[],
  players: readonly RatedPlayer[],
): Record<string, number> => {
  const scores: Record<string, number> = {};
  for (const player of players) scores[player.id] = RATING_BASELINE;
  const add = (id: string, delta: number): void => {
    const current = scores[id];
    if (current !== undefined) scores[id] = current + delta;
  };
  events.forEach((event, index) => {
    for (const [id, delta] of effectsOf(event, events[index + 1])) add(id, delta);
  });
  return Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, clamp(score)]));
};
