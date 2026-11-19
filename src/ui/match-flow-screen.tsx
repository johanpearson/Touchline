import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Career,
  type Fixture,
  fingerprintOf,
  getNextFixture,
  identityOf,
  type MatchReport,
  type MatchSession,
  planHalfTime,
  type Result,
  resumeMatch,
  sessionIssue,
} from "../game";
import { useToast } from "./components";
import { useI18n } from "./i18n-provider";
import { type MatchSessions, useMatchSessions } from "./match-session-provider";
import { type MatchSetup, matchSetupFor } from "./match-setup";
import {
  type FinishedMatch,
  type HalfTimeEditor,
  MatchScreen,
  type MatchScreenProps,
} from "./match-view";
import type { MatchProgress, ProgressMoment } from "./match-view/match-progress";
import { createSessionWriter } from "./match-view/session-writer";
import { PreMatchStep } from "./pre-match/pre-match-step";
import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

type Props = Pick<MatchScreenProps, "createRenderer" | "tickMs">;
type PlayProps = Props & {
  career: Career;
  fixture: Fixture;
  setup: MatchSetup;
  /** The session the match was rebuilt from, or null for a match from kickoff. */
  resumed: MatchSession | null;
  /** Called when the session cannot be replayed; the flow then drops it and shows the pre-match screen. */
  onResumeFailed: () => void;
};

/** Writes the progress of the match into the session store; nothing more is written once it is over. */
function useSessionWriting(career: Career, fixture: Fixture, resumed: MatchSession | null) {
  const sessions = useMatchSessions();
  const over = useRef(false);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const identity = useMemo(
    () => (resumed ? null : identityOf(career, fixture)),
    // A match from kickoff is identified once, by the plan it kicked off with.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    [],
  );
  const writer = useMemo(
    () =>
      createSessionWriter<MatchSession>(
        (session) => {
          if (!over.current) sessionsRef.current.save(session);
        },
        () => performance.now(),
      ),
    [],
  );
  const onProgress = (progress: MatchProgress, moment: ProgressMoment) => {
    const base = resumed ?? identity;
    if (!base) return;
    const { report, ...rest } = progress;
    const session: MatchSession = {
      ...base,
      ...rest,
      changes: [...progress.changes],
      ...(report ? { report } : {}),
    };
    if (!report) delete session.report;
    if (moment === "now") writer.now(session);
    else writer.throttled(session);
  };
  const finish = () => {
    over.current = true;
    sessionsRef.current.clear();
  };
  return { onProgress, finish };
}

function PlayMatch({
  career,
  fixture,
  setup,
  resumed,
  onResumeFailed,
  createRenderer,
  tickMs,
}: PlayProps) {
  const { completeMatch } = useCareer();
  const { onProgress, finish: endSession } = useSessionWriting(career, fixture, resumed);
  const [restoredMatch] = useState(() =>
    resumed ? resumeMatch(resumed, setup.createMatch) : null,
  );
  const failed = restoredMatch?.ok === false;
  useEffect(() => {
    if (failed) onResumeFailed();
  }, [failed, onResumeFailed]);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const editor: HalfTimeEditor = {
    players: career.league.players.filter((p) => club?.playerIds.includes(p.id)),
    starters: career.squadPlan.starters,
    bench: career.squadPlan.bench,
    condition: career.condition,
    tactics: career.squadPlan.tactics,
    plan: (changes) => planHalfTime(career, fixture, changes),
  };

  const finish = ({ score, scorers, engineVersion }: FinishedMatch, report?: MatchReport) => {
    const result: Result = {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: score.home,
      awayGoals: score.away,
      engineVersion,
      scorers,
    };
    endSession();
    if (completeMatch(result, report) === null) window.location.hash = hrefFor({ name: "results" });
  };

  if (failed) return null;
  const restored = resumed && restoredMatch?.ok ? resumed : null;
  return (
    <MatchScreen
      key={`${career.season.number}-${fixture.id}`}
      {...setup}
      createMatch={restoredMatch?.ok ? () => restoredMatch.match : setup.createMatch}
      userSide={fixture.homeClubId === career.userClubId ? "home" : "away"}
      createRenderer={createRenderer}
      tickMs={tickMs}
      halfTimeEditor={editor}
      restored={
        restored
          ? {
              matchTime: restored.position.matchTime,
              mode: restored.mode,
              changes: restored.changes,
              report: restored.report,
            }
          : undefined
      }
      onProgress={onProgress}
      onContinue={finish}
      onLeave={() => {
        window.location.hash = hrefFor({ name: "home" });
      }}
    />
  );
}

/** Whether the career still holds the plan the session was kicked off with. */
const holdsPlanOf = (career: Career, session: MatchSession): boolean =>
  fingerprintOf(career.squadPlan) === fingerprintOf(session.squadPlan);

type FlowProps = Props & {
  career: Career;
  fixture: Fixture;
  /** The session found when the flow opened; later saves of the running match do not change it. */
  stored: MatchSession | null;
  sessions: MatchSessions;
};

/** The session to resume, or null with the reason why a stored one is discarded. */
const usableSession = (stored: MatchSession | null, career: Career, fixture: Fixture) => {
  if (!stored) return { session: null, discarded: false };
  const issue = sessionIssue(stored, career, fixture);
  if (issue) return { session: null, discarded: true };
  return { session: stored, discarded: false };
};

function Flow({ career, fixture, stored, sessions, createRenderer, tickMs }: FlowProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { setLineup, setTactics } = useCareer();
  const [kickedOff, setKickedOff] = useState(false);
  const [first] = useState(() => usableSession(stored, career, fixture));
  const [dropped, setDropped] = useState(false);
  const session = dropped ? null : first.session;
  const discarded = first.discarded || dropped;

  // A session that cannot be resumed is dropped with a note; the pre-match screen shows.
  useEffect(() => {
    if (!discarded && !sessions.refused) return;
    toast({ title: t("toast.matchSession.title"), description: t("toast.matchSession.text") });
    sessions.clear();
  }, [discarded, sessions, toast, t]);

  // The match is played with the plan it kicked off with, which the loaded career may not hold yet.
  const mustAdoptPlan = session !== null && !holdsPlanOf(career, session);
  useEffect(() => {
    if (!session || !mustAdoptPlan) return;
    setLineup(session.squadPlan);
    setTactics(session.squadPlan.tactics);
  }, [session, mustAdoptPlan, setLineup, setTactics]);

  const setup = useMemo(() => matchSetupFor(career, fixture), [career, fixture]);
  if (mustAdoptPlan) return null;
  if (!session && !kickedOff) {
    return (
      <PreMatchStep
        career={career}
        fixture={fixture}
        setup={setup}
        onKickOff={() => setKickedOff(true)}
      />
    );
  }
  return (
    <PlayMatch
      career={career}
      fixture={fixture}
      setup={setup}
      resumed={session}
      onResumeFailed={() => setDropped(true)}
      createRenderer={createRenderer}
      tickMs={tickMs}
    />
  );
}

/**
 * Shows the pre-match screen for the user's next fixture and, on "Kick off", plays it in the match
 * view. The match in progress is kept in the match session store: leaving the screen or reloading
 * the page and coming back shows the match paused where it was, with "Resume". The pre-match screen
 * shows only when there is no session for this fixture. No result is recorded until the user presses
 * "Continue" at full time, which also deletes the session.
 */
export function MatchFlowScreen({ createRenderer, tickMs }: Props) {
  const { career } = useCareer();
  const sessions = useMatchSessions();
  const fixture = career ? getNextFixture(career.season, career.userClubId) : undefined;
  if (!career || !fixture) {
    return <Redirect to={{ name: "home" }} />;
  }
  // The store is read once at startup. A session found then remounts the flow so it resumes it; a
  // match started afterwards never changes the key.
  const loaded = sessions.initial ? "loaded" : "fresh";
  return (
    <Flow
      key={`${career.season.number}-${fixture.id}-${loaded}`}
      career={career}
      fixture={fixture}
      stored={sessions.latest()}
      sessions={sessions}
      createRenderer={createRenderer}
      tickMs={tickMs}
    />
  );
}
