import { useMemo } from "react";
import type { MatchState } from "../engine";
import { getNextFixture, type MatchReport, planHalfTime, type Result } from "../game";
import { matchSetupFor } from "./match-setup";
import { type HalfTimeEditor, MatchScreen, type MatchScreenProps } from "./match-view";

import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

type Props = Pick<MatchScreenProps, "createRenderer" | "tickMs">;

/**
 * Plays the user's next fixture in the match view. Leaving the screen mid-match resumes nothing:
 * coming back starts from kickoff and no result is recorded until the user presses "Continue"
 * at full time. A reload loses the career until the save system (M4) exists.
 */
export function MatchFlowScreen({ createRenderer, tickMs }: Props) {
  const { career, completeMatch } = useCareer();
  const fixture = career ? getNextFixture(career.season, career.userClubId) : undefined;
  const setup = useMemo(
    () => (career && fixture ? matchSetupFor(career, fixture) : null),
    [career, fixture],
  );
  if (!career || !fixture || !setup) return <Redirect to={{ name: "home" }} />;

  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const editor: HalfTimeEditor = {
    players: career.league.players.filter((p) => club?.playerIds.includes(p.id)),
    starters: career.squadPlan.starters,
    bench: career.squadPlan.bench,
    condition: career.condition,
    tactics: career.squadPlan.tactics,
    plan: (changes) => planHalfTime(career, fixture, changes),
  };

  const finish = (score: MatchState["score"], report?: MatchReport) => {
    const result: Result = {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: score.home,
      awayGoals: score.away,
    };
    if (completeMatch(result, report) === null) window.location.hash = hrefFor({ name: "results" });
  };

  return (
    <MatchScreen
      key={`${career.season.number}-${fixture.id}`}
      {...setup}
      createRenderer={createRenderer}
      tickMs={tickMs}
      halfTimeEditor={editor}
      onContinue={finish}
    />
  );
}
