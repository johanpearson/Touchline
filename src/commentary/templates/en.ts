import type { TemplateSet } from "./template-set";

export const en = {
  kickoff: ["Kick-off, {team} get us going", "We are under way, {team} start with the ball"],
  secondHalfKickoff: [
    "Second half, {team} kick it off",
    "Back for the second half, {team} get us going again",
  ],
  halfTime: ["Half-time, {score}", "The whistle goes for half-time, it is {score}"],
  fullTime: ["Full time, {score}", "That is it, full time and it ends {score}"],
  goal: [
    "Goal! {player} makes it {score}",
    "There it is! {player} for {team}, {score}",
    "{player} finds the net and it is {score}!",
    "Goal for {team}! {player} finishes coolly, {score}",
  ],
  save: [
    "{team} shoot, but the keeper is in the right place",
    "Fine save by {opponentGen} goalkeeper",
    "Effort from {team}, the keeper holds it safely",
  ],
  blocked: ["{team} shoot, but the defence gets a block in", "A last-ditch block stops {team}"],
  wide: ["{team} shoot wide", "Close! {team} shoot just past the post", "Over the bar from {team}"],
  bigSave: [
    "Huge chance for {team}, but {opponentGen} goalkeeper saves!",
    "What a save! {team} were clean through",
  ],
  bigMiss: [
    "How did that not go in? {team} miss an open goal",
    "Wide open, but {team} hit the post!",
  ],
  corner: ["Corner to {team}", "{team} force a corner", "Corner, {team} send people into the box"],
  danger: [
    "{team} press forward in the box",
    "Dangerous! {team} combine their way in",
    "{team} whip in a cross, it is bouncing around in front of goal",
    "It is getting hot in {opponentGen} penalty area",
  ],
  turnoverHigh: [
    "{team} win the ball high up and break at once",
    "Ball won by {team} far up the pitch",
    "Sloppy from {opponent}, {team} pick their pocket",
  ],
  foul: ["Free kick to {team} after a foul", "The referee stops play, foul on {team}"],
  summaryDominant: [
    "{team} have controlled the last quarter, {pct}% of the ball",
    "{team} own the ball right now, {pct}% over the last 15 minutes",
  ],
  summaryEven: [
    "An even spell, {a}–{b} in possession over the last quarter",
    "Nobody takes over, {a}–{b} in possession",
  ],
} as const satisfies TemplateSet;
