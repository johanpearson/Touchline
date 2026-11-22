import type { actionEn } from "./action-en";
import type { TemplateSet } from "./template-set";

export const actionSv = {
  kickoff: ["Avspark, {team} börjar med bollen", "Matchen är igång, {team} sparkar igång"],
  secondHalfKickoff: [
    "Andra halvlek, {team} sparkar igång",
    "Vi är tillbaka, {team} startar andra halvlek",
  ],
  halfTime: ["Halvtid, {score}", "Pausvisslan går, det står {score}"],
  fullTime: ["Slutsignal, {score}", "Där small slutsignalen, det blev {score}"],
  goal: [
    "Mål! {player} gör {score}",
    "Där satt den! {player} för {team}, {score}",
    "{player} nätar och det står {score}!",
    "Mål för {team}! {player} avslutar kallt, {score}",
  ],
  goalAssist: [
    "Mål! {passer} hittar {player} och det blir {score}",
    "{player} avslutar efter {passerGen} passning, {team} gör {score}",
    "Snyggt spel av {team}: {passer} sätter upp {player} och det står {score}!",
  ],
  penaltyAwarded: [
    "Straff till {team}! {offender} fäller {player}",
    "Domaren pekar på straffpunkten, {offender} fällde {player} i boxen",
  ],
  penaltyGoal: [
    "{player} skickar målvakten fel, {score}",
    "Straffen är i mål! {player} missar inte, {score}",
  ],
  penaltySaved: [
    "Räddat! {keeper} tar {playerGen} straff",
    "{player} slår straffen och {keeper} räddar!",
  ],
  penaltyMissed: [
    "{player} missar straffen!",
    "Utanför! {player} slarvar bort straffen för {team}",
  ],
  bigSave: [
    "Jättechans för {player}, men {keeper} räddar!",
    "Vilken räddning av {keeper}! {player} var helt fri",
  ],
  save: [
    "{player} skjuter, men {keeper} är på plats",
    "Fin räddning av {keeper} på skottet från {player}",
    "Avslut från {player}, {keeper} tar den säkert",
  ],
  blocked: ["{player} skjuter, men försvaret blockerar", "En sista blockering stoppar {player}"],
  wide: [
    "{player} skjuter utanför",
    "Nära! {player} skjuter strax utanför stolpen",
    "Över ribban från {player}",
  ],
  woodwork: ["{player} träffar stolpen!", "I stolpen från {player}, så nära för {team}"],
  bigMiss: [
    "Hur kunde det inte bli mål? {player} missar ett jättelägen för {team}",
    "Öppet mål, men {player} får inte träff",
  ],
  keyPass: [
    "{passer} spelar fram {player} med en djupledspassning",
    "En smart passning från {passer} sätter upp {player}",
  ],
  tackleStop: [
    "{player} gör en avgörande tackling på {opponentPlayer} och stoppar anfallet",
    "Bra tackling av {player} på {opponentPlayer}, faran är över",
  ],
  interceptionStop: [
    "{player} läser det perfekt och bryter passningen",
    "{player} kliver in och stoppar anfallet åt {team}",
  ],
  foul: [
    "Frispark till {team} efter att {offender} fällt {player}",
    "Domaren blåser, {offender} fäller {player}",
  ],
  corner: [
    "Hörna till {team}, {player} slår den",
    "{team} tvingar fram en hörna, {player} ställer sig vid bollen",
    "Hörna, {team} samlar folk i straffområdet",
  ],
  freeKick: [
    "{player} står över frisparken för {team}",
    "Frispark i ett lovande läge för {team}, {player} försöker",
  ],
  buildUpOpenPlay: [
    "{creator} spelar fram bollen och hittar {player}",
    "Tålmodigt spel från {team}, {creator} slår bollen till {player}",
    "{team} flyttar bollen snabbt, {creator} hittar {player} på yta",
  ],
  buildUpThroughBall: [
    "{creator} spelar in en djupledspass till {player}!",
    "En passning mellan lagdelarna från {creator} och {player} är fri",
    "{creator} klyver försvaret, {player} är igenom",
  ],
  buildUpCross: [
    "{creator} slår in ett inlägg, {player} väntar vid bortre stolpen",
    "Bollen kommer in från {creator} och landar hos {player}",
    "Ett farligt inlägg från {creator} mot {player}",
  ],
  buildUpCutBack: [
    "{creator} tar sig till kortlinjen och drar tillbaka bollen till {player}",
    "{creator} lägger tillbaka bollen över straffområdet, {player} är där",
    "En låg passning från {creator} in i farozonen, {player} kommer",
  ],
  buildUpCounter: [
    "{team} kontrar snabbt, {creator} skickar iväg {player}",
    "Kontring! {creator} sätter {player} på språng",
    "Bollen vinns och {team} är på väg, {creator} hittar {player}",
  ],
  buildUpSetPiece: [
    "{creator} slår fastbollen och den hamnar hos {player}",
    "Bollen slås in av {creator}, {player} når den först",
    "{creator} hittar {player} efter fastbollen",
  ],
  buildUpFreeKick: [
    "{player} ställer upp för frisparken, muren är på plats",
    "Frispark i ett farligt läge, {player} får skjuta",
    "{player} står över bollen, {team} har en riktig chans här",
  ],
  reactionSaved: [
    "Räddning! {keeper} kastar sig och stoppar {playerGen} skott",
    "{player} måste göra mål, men {keeper} står pall",
    "Vilken räddning av {keeper}! {player} kan inte tro det",
  ],
  reactionWoodwork: [
    "I stolpen! {player} var centimeter från mål",
    "{player} träffar ramen, så nära för {team}",
    "Ramen räddar {opponent}, {player} kan inte tro det",
  ],
  reactionBlocked: [
    "{player} skjuter, men försvaret kastar sig i vägen",
    "Blockerat i sista stund, {player} nekas",
    "Ett desperat block stoppar {player}, faran är över",
  ],
  reactionWide: [
    "{player} skjuter utanför, en stor chans går förlorad",
    "Utanför! {player} borde ha gjort bättre ifrån sig",
    "{player} drar skottet förbi stolpen, och {team} kommer ångra den",
  ],
  reactionOver: [
    "{player} skjuter högt över ribban",
    "Över! {player} blir rasande på sig själv efter den missen",
    "{player} blåser över från ett bra läge",
  ],
  summaryDominant: [
    "{team} har styrt senaste kvarten, {pct} % bollinnehav",
    "{team} äger bollen just nu, {pct} % senaste kvarten",
  ],
  summaryEven: [
    "Jämnt spel, {a}–{b} i bollinnehav senaste kvarten",
    "Ingen tar över, {a}–{b} i bollinnehav",
  ],
} as const satisfies TemplateSet<keyof typeof actionEn>;
