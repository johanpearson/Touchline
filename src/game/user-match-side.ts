import type { Side } from "../engine";
import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import type { Player } from "./player";
import { clubSquad } from "./squad-plan";

/** The side the user's club plays on in `fixture` and the club's squad. */
export type UserMatchSide = { side: Side; squad: Player[] };

/** A fixture without the user's club, or an unknown user club, is a programmer error (`RangeError`). */
export const userMatchSide = (career: Career, fixture: Fixture): UserMatchSide => {
  const side: Side | undefined =
    fixture.homeClubId === career.userClubId
      ? "home"
      : fixture.awayClubId === career.userClubId
        ? "away"
        : undefined;
  if (!side) throw new RangeError(`The user's club does not play fixture ${fixture.id}`);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) throw new RangeError(`Unknown user club: ${career.userClubId}`);
  return { side, squad: clubSquad(club, career.league.players) };
};
