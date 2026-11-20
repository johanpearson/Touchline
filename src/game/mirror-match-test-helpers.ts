import type { ActionEvent, ActionMatch, MatchInput, Side, TeamSheet } from "../engine";
import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import { matchInputFor } from "./match-input-for";

const copyWithPrefix = (sheet: TeamSheet, prefix: string): TeamSheet => {
  const prefixed = <T extends { id: string }>(players: readonly T[]): T[] =>
    players.map((p) => ({ ...p, id: `${prefix}${p.id}` }));
  return { ...sheet, starters: prefixed(sheet.starters), bench: prefixed(sheet.bench) };
};

/** The user's club against an exact copy of itself with neutral tactics, so only the user's changes differ. */
export const mirrorInput = (career: Career, fixture: Fixture): MatchInput => {
  const input = matchInputFor(career, fixture);
  const own = input.home;
  return { ...input, away: copyWithPrefix({ ...own, tactics: input.away.tactics }, "x-") };
};

/** A fixture of the user's club at home, so the user is the home side. */
export const userFixtureAsHome = (career: Career): Fixture =>
  career.season.fixtures.find((f) => f.homeClubId === career.userClubId) as Fixture;

export const countShots = (events: readonly ActionEvent[], side: Side): number =>
  events.filter((e) => e.type === "shot" && e.team === side).length;

/** Plays to `minute`, starting the second half on the way when the minute is after half-time. */
export const advanceThroughHalfTime = (match: ActionMatch, minute: number): void => {
  const limit = minute * 60;
  match.advanceTo(limit);
  if (match.state.period === "halfTime" && limit > match.state.time) {
    match.resume();
    match.advanceTo(limit);
  }
};
