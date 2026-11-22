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
  buildUpOpenPlay: [
    "{creator} works it forward and picks out {player}",
    "Patient play from {team}, {creator} slips the ball to {player}",
    "{team} move it quickly, {creator} finds {player} in space",
  ],
  buildUpThroughBall: [
    "{creator} threads a ball through the defence for {player}!",
    "A pass between the lines from {creator} and {player} is in behind",
    "{creator} splits the defence, {player} is through",
  ],
  buildUpCross: [
    "{creator} swings in a cross, {player} is waiting at the far post",
    "The ball comes in from {creator}, and it drops for {player}",
    "A dangerous delivery from {creator} towards {player}",
  ],
  buildUpCutBack: [
    "{creator} reaches the byline and pulls it back for {player}",
    "{creator} cuts it back across the box, {player} arrives",
    "A low ball from {creator} into the danger area, {player} is there",
  ],
  buildUpCounter: [
    "{team} break at speed, {creator} releases {player}",
    "Counter-attack! {creator} sends {player} away",
    "The ball is won and {team} are off, {creator} finds {player}",
  ],
  buildUpSetPiece: [
    "{creator} delivers the set piece and it falls to {player}",
    "The ball is swung in by {creator}, {player} gets on the end of it",
    "{creator} picks out {player} from the dead ball",
  ],
  buildUpFreeKick: [
    "{player} lines up the free kick, the wall is set",
    "A free kick in a dangerous spot, {player} will have a shot",
    "{player} stands over it, {team} have a real chance here",
  ],
  reactionSaved: [
    "Saved! {keeper} gets down to keep out {playerGen} shot",
    "{player} had to score, but {keeper} stands tall",
    "What a stop by {keeper}! {player} cannot believe it",
  ],
  reactionWoodwork: [
    "Off the post! {player} was inches away",
    "{player} hits the frame, agonisingly close for {team}",
    "The woodwork saves {opponent}, {player} cannot believe it",
  ],
  reactionBlocked: [
    "{player} shoots, but the defence throws itself in the way",
    "Blocked at the last second, {player} is denied",
    "A desperate block stops {player}, the danger is cleared",
  ],
  reactionWide: [
    "{player} drags it wide, a big chance gone",
    "Wide! {player} should have done better there",
    "{player} pulls the shot past the post, and {team} will rue that one",
  ],
  reactionOver: [
    "{player} skies it over the bar",
    "Over! {player} will be furious with that miss",
    "{player} blazes it over from a good position",
  ],
  summaryDominant: [
    "{team} have controlled the last quarter, {pct}% of the ball",
    "{team} own the ball right now, {pct}% over the last 15 minutes",
  ],
  summaryEven: [
    "An even spell, {a}–{b} in possession over the last quarter",
    "Nobody takes over, {a}–{b} in possession",
  ],
} as const satisfies TemplateSet;
