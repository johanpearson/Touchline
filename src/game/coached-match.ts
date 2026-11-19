import { type ActionMatch, type ActionMatchOptions, createActionMatch, type Side } from "../engine";
import {
  AI_HALF_TIME_MINUTE,
  AI_TACTICS,
  AI_WINDOW_MINUTES,
  type AiChanges,
  NO_AI_CHANGES,
  planAiChange,
} from "./ai-coach";
import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import type { Lineup } from "./lineup";
import { liveSquadAfter } from "./live-squad";
import { aiLineupFor, matchInputFor, matchSeed } from "./match-input-for";
import type { Player } from "./player";
import { reportOf } from "./report-of";
import { tacticsAtMinute } from "./shouts";
import { clubSquad } from "./squad-plan";
import { toEnginePlayers } from "./to-engine-players";
import { type MatchReport, withEnergy } from "./update-condition";

/** The engine's options and, for tests that play one fixture many times, another seed than `matchSeed`. */
export type CoachedMatchOptions = ActionMatchOptions & { seed?: number };

/** An action match in which every AI club substitutes and shouts at the same fixed moments. */
export type CoachedMatch = ActionMatch & {
  /** Minutes, shout fatigue and the energy so far of each AI side, as if the match ended at 90 minutes. */
  aiReports: () => Partial<Record<Side, MatchReport>>;
};

type Coach = {
  side: Side;
  squad: Player[];
  plan: Lineup;
  changes: AiChanges;
};

const SIDES: readonly Side[] = ["home", "away"];

const clubIdOf = (fixture: Fixture, side: Side): string =>
  side === "home" ? fixture.homeClubId : fixture.awayClubId;

const coachesOf = (career: Career, fixture: Fixture): Coach[] =>
  SIDES.filter((side) => clubIdOf(fixture, side) !== career.userClubId).map((side) => {
    const clubId = clubIdOf(fixture, side);
    const club = career.league.clubs.find((c) => c.id === clubId);
    if (!club) throw new RangeError(`Unknown club: ${clubId}`);
    return {
      side,
      squad: clubSquad(club, career.league.players),
      plan: aiLineupFor(career, clubId),
      changes: NO_AI_CHANGES,
    };
  });

const isPlaying = (period: ActionMatch["state"]["period"]): boolean =>
  period === "firstHalf" || period === "secondHalf";

/** A pause at which the AI clubs act; `halfTime` marks the half-time window. */
type AiMoment = { minute: number; halfTime: boolean };

/** Lets one AI side act at `minute` and applies the result to the match. */
const act = (career: Career, match: ActionMatch, coach: Coach, { minute, halfTime }: AiMoment) => {
  const { score } = match.state;
  const plan = planAiChange({
    squad: coach.squad,
    plan: coach.plan,
    condition: career.condition,
    previous: coach.changes,
    situation: {
      minute,
      goalsFor: score[coach.side],
      goalsAgainst: score[coach.side === "home" ? "away" : "home"],
    },
  });
  const substitutions = plan.substitutions.map((s) => ({ ...s, minute, halfTime }));
  coach.changes = {
    substitutions: [...coach.changes.substitutions, ...substitutions],
    shouts: plan.shout
      ? [...coach.changes.shouts, { kind: plan.shout, minute }]
      : coach.changes.shouts,
  };
  const tactics = { ...tacticsAtMinute(AI_TACTICS, coach.changes.shouts, minute) };
  if (substitutions.length === 0) {
    match.applyChange({ side: coach.side, tactics });
    return;
  }
  const live = liveSquadAfter(coach.plan, coach.changes.substitutions, () => "MID");
  const lineup = toEnginePlayers(
    { formation: coach.plan.formation, starters: live.starters, bench: live.bench },
    coach.squad,
    career.condition,
  );
  match.applyChange({ side: coach.side, lineup, tactics });
};

/**
 * Creates the match of `fixture` with the same input and seed as `matchInputFor` and `matchSeed`,
 * and lets every AI club (all clubs but the user's) change substitutions and shouts at half-time
 * and minutes 60, 70 and 80 by `planAiChange`. The decisions come only from the match state at those
 * moments, so the quick sim and the match screen play the same match however `advanceTo` is split.
 */
export const createCoachedMatch = (
  career: Career,
  fixture: Fixture,
  options: CoachedMatchOptions = {},
): CoachedMatch => {
  const match = createActionMatch(
    matchInputFor(career, fixture),
    options.seed ?? matchSeed(career, fixture),
    options,
  );
  const coaches = coachesOf(career, fixture);
  let next = 0;
  const actAll = (moment: AiMoment) => {
    for (const coach of coaches) act(career, match, coach, moment);
  };

  return {
    get events() {
      return match.events;
    },
    get state() {
      return match.state;
    },
    get changes() {
      return match.changes;
    },
    applyChange: match.applyChange,
    advanceTo: (seconds) => {
      while (
        next < AI_WINDOW_MINUTES.length &&
        (AI_WINDOW_MINUTES[next] as number) * 60 <= seconds
      ) {
        const minute = AI_WINDOW_MINUTES[next] as number;
        match.advanceTo(minute * 60);
        if (!isPlaying(match.state.period)) return;
        actAll({ minute, halfTime: false });
        next += 1;
      }
      match.advanceTo(seconds);
    },
    resume: () => {
      if (match.state.period === "halfTime")
        actAll({ minute: AI_HALF_TIME_MINUTE, halfTime: true });
      match.resume();
    },
    aiReports: () =>
      Object.fromEntries(
        coaches.map((c) => [
          c.side,
          withEnergy(reportOf(c.plan, c.squad, c.changes, AI_TACTICS), match.state.energy, c.squad),
        ]),
      ),
  };
};
