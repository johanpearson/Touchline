import { type Career, getNextFixture, isSeasonComplete, isWindowOpen } from "../../game";
import type { LinkRoute } from "./nav-config";

export type HeaderAction =
  | { kind: "continue"; route: LinkRoute }
  | { kind: "season-complete"; route: LinkRoute }
  | { kind: "off-season"; route: LinkRoute };

/** The primary action of the shell header: play the next match, or finish the season, then the off-season. */
export function headerActionFor(career: Career): HeaderAction | null {
  if (getNextFixture(career.season, career.userClubId)) {
    return { kind: "continue", route: { name: "match" } };
  }
  if (!isSeasonComplete(career.season)) return null;
  return isWindowOpen(career)
    ? { kind: "off-season", route: { name: "off-season" } }
    : { kind: "season-complete", route: { name: "season-end" } };
}
