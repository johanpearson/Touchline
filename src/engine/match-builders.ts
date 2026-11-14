import type { MatchInput } from "./match-input";
import { NEUTRAL_TACTICS, type TeamTactics } from "./tactics";
import type { TeamMatchProfile } from "./team-match-profile";

const averageProfile = (name: string): TeamMatchProfile => ({
  name,
  buildUp: 0.5,
  progression: 0.5,
  chanceCreation: 0.5,
  finishing: 0.5,
  pressing: 0.5,
  defending: 0.5,
  goalkeeping: 0.5,
});

type ProfileBuilder = {
  named: (value: string) => ProfileBuilder;
  withBuildUp: (value: number) => ProfileBuilder;
  withProgression: (value: number) => ProfileBuilder;
  withChanceCreation: (value: number) => ProfileBuilder;
  withFinishing: (value: number) => ProfileBuilder;
  withPressing: (value: number) => ProfileBuilder;
  withDefending: (value: number) => ProfileBuilder;
  withGoalkeeping: (value: number) => ProfileBuilder;
  /** Sets all seven phase ratings at once. */
  withAllRatings: (value: number) => ProfileBuilder;
  build: () => TeamMatchProfile;
};

const profileBuilder = (profile: TeamMatchProfile): ProfileBuilder => {
  const with_ = (changes: Partial<TeamMatchProfile>): ProfileBuilder =>
    profileBuilder({ ...profile, ...changes });
  return {
    named: (name) => with_({ name }),
    withBuildUp: (buildUp) => with_({ buildUp }),
    withProgression: (progression) => with_({ progression }),
    withChanceCreation: (chanceCreation) => with_({ chanceCreation }),
    withFinishing: (finishing) => with_({ finishing }),
    withPressing: (pressing) => with_({ pressing }),
    withDefending: (defending) => with_({ defending }),
    withGoalkeeping: (goalkeeping) => with_({ goalkeeping }),
    withAllRatings: (value) =>
      with_({
        buildUp: value,
        progression: value,
        chanceCreation: value,
        finishing: value,
        pressing: value,
        defending: value,
        goalkeeping: value,
      }),
    build: () => ({ ...profile }),
  };
};

/** Test builder for `TeamMatchProfile`; starts as an average team. */
export const aTeamProfile = (name = "Team"): ProfileBuilder => profileBuilder(averageProfile(name));

type InputBuilder = {
  withHome: (profile: TeamMatchProfile) => InputBuilder;
  withAway: (profile: TeamMatchProfile) => InputBuilder;
  /** Sets the tactics of one or both sides; omitted sides keep their current tactics. */
  withTactics: (tactics: { home?: TeamTactics; away?: TeamTactics }) => InputBuilder;
  build: () => MatchInput;
};

const inputBuilder = (input: MatchInput): InputBuilder => ({
  withHome: (home) => inputBuilder({ ...input, home }),
  withAway: (away) => inputBuilder({ ...input, away }),
  withTactics: ({ home, away }) =>
    inputBuilder({
      ...input,
      homeTactics: home ?? input.homeTactics,
      awayTactics: away ?? input.awayTactics,
    }),
  build: () => ({
    ...input,
    homeTactics: { ...input.homeTactics },
    awayTactics: { ...input.awayTactics },
  }),
});

/** Test builder for `MatchInput`; two average teams with neutral tactics. */
export const aMatchInput = (): InputBuilder =>
  inputBuilder({
    home: aTeamProfile("Home").build(),
    away: aTeamProfile("Away").build(),
    homeTactics: NEUTRAL_TACTICS,
    awayTactics: NEUTRAL_TACTICS,
  });
