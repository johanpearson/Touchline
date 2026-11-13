/** Phase ratings of one team, each in the range 0..1 (0.5 is an average team). */
export type TeamMatchProfile = {
  /** Display name of the team. */
  name: string;
  /** Ability to keep the ball and start attacks from the back. */
  buildUp: number;
  /** Ability to move the ball up the pitch through the zones. */
  progression: number;
  /** Ability to create shooting chances in the final third. */
  chanceCreation: number;
  /** Ability to turn shots into goals. */
  finishing: number;
  /** Ability to win the ball back high up the pitch. */
  pressing: number;
  /** Ability to stop opponent attacks and limit chance quality. */
  defending: number;
  /** Ability of the goalkeeper to save shots. */
  goalkeeping: number;
};
