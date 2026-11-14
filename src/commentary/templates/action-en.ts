import type { TemplateSet } from "./template-set";

export const actionEn = {
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
  goalAssist: [
    "Goal! {passer} picks out {player} and it is {score}",
    "{player} finishes off {passerGen} pass, {team} lead the way, {score}",
    "Lovely build-up from {team}: {passer} sets up {player} and it is {score}!",
  ],
  penaltyAwarded: [
    "Penalty to {team}! {offender} brings down {player}",
    "The referee points to the spot, {offender} fouled {player} in the box",
  ],
  penaltyGoal: [
    "{player} sends the keeper the wrong way, {score}",
    "Penalty scored! {player} makes no mistake, {score}",
  ],
  penaltySaved: [
    "Saved! {keeper} keeps out {playerGen} penalty",
    "{player} takes the penalty and {keeper} saves it!",
  ],
  penaltyMissed: [
    "{player} misses the penalty!",
    "Off the target! {player} wastes the penalty for {team}",
  ],
  bigSave: [
    "Huge chance for {player}, but {keeper} saves!",
    "What a save by {keeper}! {player} was clean through",
  ],
  save: [
    "{player} shoots, but {keeper} is in the right place",
    "Fine save by {keeper} from {player}",
    "Effort from {player}, {keeper} holds it safely",
  ],
  blocked: [
    "{player} shoots, but the defence gets a block in",
    "A last-ditch block stops {player}",
  ],
  wide: [
    "{player} shoots wide",
    "Close! {player} shoots just past the post",
    "Over the bar from {player}",
  ],
  woodwork: ["{player} hits the woodwork!", "Off the post from {player}, so close for {team}"],
  bigMiss: [
    "How did that not go in? {player} misses a great chance for {team}",
    "Wide open, but {player} cannot hit the target",
  ],
  keyPass: [
    "{passer} threads the ball through to {player}",
    "A clever pass from {passer} sets up {player}",
  ],
  throughBall: [
    "{passer} slips a through ball in behind {opponentGen} defence",
    "Splendid vision from {passer}, a ball over the top for {player}",
  ],
  tackleStop: [
    "{player} makes a crucial tackle on {opponentPlayer} to stop the attack",
    "Great tackle by {player} on {opponentPlayer}, the danger is over",
  ],
  interceptionStop: [
    "{player} reads it perfectly and cuts out the pass",
    "{player} steps in and stops the attack for {team}",
  ],
  foul: [
    "Free kick to {team} after {offender} fouls {player}",
    "The referee stops play, {offender} brings down {player}",
  ],
  corner: [
    "Corner to {team}, {player} will take it",
    "{team} force a corner, {player} stands over it",
    "Corner, {team} send people into the box",
  ],
  freeKick: [
    "{player} stands over the free kick for {team}",
    "Free kick in a promising place for {team}, {player} has a go",
  ],
  throwIn: ["Throw-in for {team}, taken by {player}", "{player} takes the throw for {team}"],
  goalKick: ["{player} takes the goal kick for {team}", "Goal kick, {player} sends it long"],
  summaryDominant: [
    "{team} have controlled the last quarter, {pct}% of the ball",
    "{team} own the ball right now, {pct}% over the last 15 minutes",
  ],
  summaryEven: [
    "An even spell, {a}–{b} in possession over the last quarter",
    "Nobody takes over, {a}–{b} in possession",
  ],
} as const satisfies TemplateSet;
