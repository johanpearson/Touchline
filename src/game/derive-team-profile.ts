import type { TeamMatchProfile } from "../engine";
import type { Club } from "./club";
import { baseRatings } from "./phase-ratings";
import { pickBestEleven } from "./pick-best-eleven";
import type { Player } from "./player";

/**
 * Derives the engine's seven phase ratings (0..1) from the club's best 4-4-2 eleven at full
 * condition (see `baseRatings` for the attribute mapping). Same as `deriveLineupProfile` with a
 * 4-4-2 best-eleven lineup and neutral condition.
 * Each attribute is rescaled from 1..20 to 0..1 (1 gives 0, 20 gives 1, 10 gives about 0.47) and
 * averaged over the listed positions:
 * - buildUp = passing + ballControl (outfield)
 * - progression = dribbling + pace + vision (outfield)
 * - chanceCreation = vision + passing (MID, FWD)
 * - finishing = finishing (FWD, MID)
 * - pressing = workRate + strength (outfield)
 * - defending = tackling + positioning (DEF, MID)
 * - goalkeeping = handling + reflexes (GK)
 */
export const deriveTeamProfile = (club: Club, players: readonly Player[]): TeamMatchProfile => {
  const eleven = pickBestEleven(players.filter((p) => club.playerIds.includes(p.id)));
  return {
    name: club.name,
    ...baseRatings(eleven.map((p) => ({ position: p.position, attributes: p }))),
  };
};
