import {
  type Career,
  type Club,
  deriveClubLineRatings,
  deriveLineRatings,
  type Fixture,
  type LineRatings,
  type Player,
  type PlayerPosition,
} from "../../game";
import type { MatchSetup } from "../match-setup";
import { LOW_FITNESS } from "../plan-rows";

export type LineupEntry = {
  player: Player;
  /** The position played in this match (the engine's, which can differ from the player's own). */
  position: PlayerPosition;
  fitness: number;
  form: number;
  lowFitness: boolean;
};

export type PreMatchLineup = { starters: LineupEntry[]; bench: LineupEntry[] };

const FULL_FITNESS = 100;
const NEUTRAL_FORM = 5;

/** Which side of the fixture the user's club plays. */
export const userSideOf = (career: Career, fixture: Fixture): "home" | "away" =>
  fixture.homeClubId === career.userClubId ? "home" : "away";

const clubOf = (career: Career, clubId: string): Club | undefined =>
  career.league.clubs.find((c) => c.id === clubId);

const squadOf = (career: Career, club: Club | undefined): Player[] =>
  career.league.players.filter((p) => club?.playerIds.includes(p.id));

/**
 * The user's eleven and bench exactly as the match input has them (the same list the engine plays), with
 * the condition each player brings into the match.
 */
export const preMatchLineup = (
  career: Career,
  fixture: Fixture,
  setup: MatchSetup,
): PreMatchLineup => {
  const sheet = setup.input[userSideOf(career, fixture)];
  const byId = new Map(career.league.players.map((p) => [p.id, p]));
  const entries = (list: readonly { id: string; position: PlayerPosition }[]): LineupEntry[] =>
    list.flatMap(({ id, position }) => {
      const player = byId.get(id);
      if (!player) return [];
      const fitness = Math.round(career.condition[id]?.fitness ?? FULL_FITNESS);
      const form = career.condition[id]?.form ?? NEUTRAL_FORM;
      return [{ player, position, fitness, form, lowFitness: fitness < LOW_FITNESS }];
    });
  return { starters: entries(sheet.starters), bench: entries(sheet.bench) };
};

/** The line ratings a club brings: the saved plan for the user's club, the best eleven for any other. */
export const lineRatingsOf = (career: Career, clubId: string): LineRatings => {
  const club = clubOf(career, clubId);
  if (clubId === career.userClubId) {
    return deriveLineRatings(squadOf(career, club), career.squadPlan, career.condition);
  }
  return club ? deriveClubLineRatings(club, career.league.players) : emptyRatings();
};

const emptyRatings = (): LineRatings => ({
  goalkeeping: 0,
  defence: 0,
  midfield: 0,
  attack: 0,
  overall: 0,
});
