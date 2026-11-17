import { type Career, getNextFixture, isSeasonComplete } from "../../game";
import type { LinkRoute } from "./nav-config";

export type HeaderAction =
  | { kind: "continue"; route: LinkRoute }
  | { kind: "season-complete"; route: LinkRoute };

/** The primary action of the shell header: play the next match, or finish the season. */
export function headerActionFor(career: Career): HeaderAction | null {
  if (getNextFixture(career.season, career.userClubId)) {
    return { kind: "continue", route: { name: "match" } };
  }
  return isSeasonComplete(career.season)
    ? { kind: "season-complete", route: { name: "season-end" } }
    : null;
}
