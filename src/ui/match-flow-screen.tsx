import { useMemo, useState } from "react";
import {
  type Career,
  type Fixture,
  getNextFixture,
  type MatchReport,
  planHalfTime,
  type Result,
  userReportWithEnergy,
} from "../game";
import { type MatchSetup, matchSetupFor } from "./match-setup";
import {
  type FinishedMatch,
  type HalfTimeEditor,
  MatchScreen,
  type MatchScreenProps,
} from "./match-view";
import { PreMatchStep } from "./pre-match/pre-match-step";
import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

type Props = Pick<MatchScreenProps, "createRenderer" | "tickMs">;
type PlayProps = Props & { career: Career; fixture: Fixture; setup: MatchSetup };

function PlayMatch({ career, fixture, setup, createRenderer, tickMs }: PlayProps) {
  const { completeMatch } = useCareer();
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const editor: HalfTimeEditor = {
    players: career.league.players.filter((p) => club?.playerIds.includes(p.id)),
    starters: career.squadPlan.starters,
    bench: career.squadPlan.bench,
    condition: career.condition,
    tactics: career.squadPlan.tactics,
    plan: (changes) => planHalfTime(career, fixture, changes),
  };

  const finish = (
    { score, scorers, engineVersion, energy }: FinishedMatch,
    report?: MatchReport,
  ) => {
    const result: Result = {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: score.home,
      awayGoals: score.away,
      engineVersion,
      scorers,
    };
    if (completeMatch(result, userReportWithEnergy(career, report, energy)) === null)
      window.location.hash = hrefFor({ name: "results" });
  };

  return (
    <MatchScreen
      key={`${career.season.number}-${fixture.id}`}
      {...setup}
      userSide={fixture.homeClubId === career.userClubId ? "home" : "away"}
      createRenderer={createRenderer}
      tickMs={tickMs}
      halfTimeEditor={editor}
      onContinue={finish}
      onLeave={() => {
        window.location.hash = hrefFor({ name: "home" });
      }}
    />
  );
}

/**
 * Shows the pre-match screen for the user's next fixture and, on "Kick off", plays it in the match view.
 * Leaving the screen resumes nothing: coming back shows the pre-match screen again and the match starts
 * from kickoff; no result is recorded until the user presses "Continue" at full time.
 */
export function MatchFlowScreen({ createRenderer, tickMs }: Props) {
  const { career } = useCareer();
  const [kickedOff, setKickedOff] = useState<string | null>(null);
  const fixture = career ? getNextFixture(career.season, career.userClubId) : undefined;
  const setup = useMemo(
    () => (career && fixture ? matchSetupFor(career, fixture) : null),
    [career, fixture],
  );
  if (!career || !fixture || !setup) {
    return <Redirect to={{ name: "home" }} />;
  }
  if (kickedOff !== fixture.id) {
    return (
      <PreMatchStep
        career={career}
        fixture={fixture}
        setup={setup}
        onKickOff={() => setKickedOff(fixture.id)}
      />
    );
  }
  return (
    <PlayMatch
      career={career}
      fixture={fixture}
      setup={setup}
      createRenderer={createRenderer}
      tickMs={tickMs}
    />
  );
}
