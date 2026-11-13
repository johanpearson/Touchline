import type { TeamMatchProfile } from "../engine";
import type { Club } from "./club";
import { pickBestEleven } from "./pick-best-eleven";
import { type AttributeName, MAX_ATTRIBUTE, MIN_ATTRIBUTE, type Player } from "./player";
import type { PlayerPosition } from "./squad-player";

const OUTFIELD: readonly PlayerPosition[] = ["DEF", "MID", "FWD"];

/** Mean of the given attributes over the given positions, rescaled from 1..20 to 0..1. */
const rating = (
  eleven: readonly Player[],
  positions: readonly PlayerPosition[],
  attributes: readonly AttributeName[],
): number => {
  const group = eleven.filter((p) => positions.includes(p.position));
  const total = group.reduce((sum, p) => sum + attributes.reduce((s, a) => s + p[a], 0), 0);
  const mean = total / (group.length * attributes.length);
  return (mean - MIN_ATTRIBUTE) / (MAX_ATTRIBUTE - MIN_ATTRIBUTE);
};

/**
 * Derives the engine's seven phase ratings (0..1) from the club's best eleven.
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
    buildUp: rating(eleven, OUTFIELD, ["passing", "ballControl"]),
    progression: rating(eleven, OUTFIELD, ["dribbling", "pace", "vision"]),
    chanceCreation: rating(eleven, ["MID", "FWD"], ["vision", "passing"]),
    finishing: rating(eleven, ["FWD", "MID"], ["finishing"]),
    pressing: rating(eleven, OUTFIELD, ["workRate", "strength"]),
    defending: rating(eleven, ["DEF", "MID"], ["tackling", "positioning"]),
    goalkeeping: rating(eleven, ["GK"], ["handling", "reflexes"]),
  };
};
