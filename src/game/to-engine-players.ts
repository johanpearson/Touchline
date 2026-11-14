import {
  type EnginePlayer,
  type EnginePosition,
  MAX_ENGINE_ATTRIBUTE,
  MIN_ENGINE_ATTRIBUTE,
} from "../engine";
import type { Lineup } from "./lineup";
import { ATTRIBUTE_NAMES, type Player, type PlayerAttributes } from "./player";
import { effectiveAttributes, initialCondition, type PlayerCondition } from "./player-condition";

type Conditions = Readonly<Record<string, PlayerCondition>>;

const LINE_ORDER: readonly EnginePosition[] = ["GK", "DEF", "MID", "FWD"];

const clampAttribute = (value: number): number =>
  Math.min(MAX_ENGINE_ATTRIBUTE, Math.max(MIN_ENGINE_ATTRIBUTE, value));

/**
 * Effective attributes (fitness and form applied) are floats and can leave 1..20 slightly, for
 * example a 20 with top form; the engine validates the range, so they are clamped here.
 */
const clampedAttributes = (attributes: PlayerAttributes): PlayerAttributes =>
  Object.fromEntries(
    ATTRIBUTE_NAMES.map((name) => [name, clampAttribute(attributes[name])]),
  ) as PlayerAttributes;

const toEnginePlayer = (player: Player, condition: Conditions): EnginePlayer => ({
  id: player.id,
  position: player.position,
  attributes: clampedAttributes(
    effectiveAttributes(player, condition[player.id] ?? initialCondition()),
  ),
});

const playersById = (ids: readonly string[], players: readonly Player[]): Player[] => {
  const byId = new Map(players.map((p) => [p.id, p]));
  return ids.map((id) => {
    const player = byId.get(id);
    if (!player) throw new RangeError(`Unknown player: ${id}`);
    return player;
  });
};

/**
 * The starters as engine players in slot order: the goalkeeper, then defenders, midfielders and
 * forwards, each line in the lineup's order (the lane order, left to right). Callers validate the
 * lineup first; an unknown player id throws a `RangeError`.
 *
 * Goalkeepers keep the generator's weak outfield attributes (passing and ball control about 6 to
 * 7 points below an outfield player of the same quality, never below 1), which suits distribution
 * from goal kicks; handling and reflexes carry the saves.
 */
export const toEnginePlayers = (
  lineup: Lineup,
  players: readonly Player[],
  condition: Conditions,
): EnginePlayer[] => {
  const starters = playersById(lineup.starters, players);
  return LINE_ORDER.flatMap((position) =>
    starters.filter((p) => p.position === position).map((p) => toEnginePlayer(p, condition)),
  );
};

/** The bench as engine players, in the lineup's bench order. */
export const toEngineBench = (
  lineup: Lineup,
  players: readonly Player[],
  condition: Conditions,
): EnginePlayer[] => playersById(lineup.bench, players).map((p) => toEnginePlayer(p, condition));
