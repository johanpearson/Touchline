import { type Club, deriveTeamProfile, type Player } from "../game";

/** A club's overall rating from 0 to 100: the mean of its seven derived phase ratings. */
export const clubRating = (club: Club, players: readonly Player[]): number => {
  const profile = deriveTeamProfile(club, players);
  const phases = [
    profile.buildUp,
    profile.progression,
    profile.chanceCreation,
    profile.finishing,
    profile.pressing,
    profile.defending,
    profile.goalkeeping,
  ];
  const mean = phases.reduce((sum, value) => sum + value, 0) / phases.length;
  return Math.round(mean * 100);
};
