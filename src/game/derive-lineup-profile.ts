import type { TeamMatchProfile } from "../engine";
import { FORMATION_OFFSETS, PHASE_RATINGS } from "./formation-offsets";
import { type Lineup, validateLineup } from "./lineup";
import { baseRatings, type Starter } from "./phase-ratings";
import type { Player } from "./player";
import { effectiveAttributes, initialCondition, type PlayerCondition } from "./player-condition";

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Derives the engine's seven phase ratings from a lineup: the starters' effective attributes
 * (stored attributes scaled by fitness and form), mapped to phases as in `deriveTeamProfile`, then
 * shifted by the formation's offsets (see `FORMATION_OFFSETS`) and clamped to 0..1.
 * Players are found in `players` by id; a player without an entry in `condition` is treated as
 * fully fit with neutral form. An invalid lineup is a programmer error and throws a `RangeError`;
 * callers validate user input with `validateLineup` first.
 */
export const deriveLineupProfile = (
  name: string,
  players: readonly Player[],
  lineup: Lineup,
  condition: Readonly<Record<string, PlayerCondition>>,
): TeamMatchProfile => {
  const checked = validateLineup(lineup, players);
  if (!checked.ok) throw new RangeError(`Invalid lineup: ${checked.error}`);
  const byId = new Map(players.map((p) => [p.id, p]));
  const eleven = lineup.starters.map((id): Starter => {
    const player = byId.get(id) as Player;
    return {
      position: player.position,
      attributes: effectiveAttributes(player, condition[id] ?? initialCondition()),
    };
  });
  const offsets = FORMATION_OFFSETS[lineup.formation];
  const ratings = baseRatings(eleven);
  const shifted = Object.fromEntries(
    PHASE_RATINGS.map((phase) => [phase, clamp01(ratings[phase] + offsets[phase])]),
  ) as Omit<TeamMatchProfile, "name">;
  return { name, ...shifted };
};
