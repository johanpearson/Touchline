import type { en } from "./en";
import type { TemplateSet } from "./template-set";

export const sv = {
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
  save: [
    "{team} skjuter, men målvakten är på plats",
    "Fin räddning av {opponentGen} målvakt",
    "Avslut från {team}, målvakten tar den säkert",
  ],
  blocked: ["{team} skjuter, men försvaret blockerar", "En sista blockering stoppar {team}"],
  wide: [
    "{team} skjuter utanför",
    "Nära! {team} skjuter strax utanför stolpen",
    "Över ribban från {team}",
  ],
  bigSave: [
    "Jättechans för {team}, men {opponentGen} målvakt räddar!",
    "Vilken räddning! {team} var helt fria",
  ],
  bigMiss: [
    "Hur kunde det inte bli mål? {team} missar öppet läge",
    "Öppet mål, men {team} sätter den i stolpen!",
  ],
  corner: [
    "Hörna till {team}",
    "{team} tvingar fram en hörna",
    "Hörna, {team} samlar folk i straffområdet",
  ],
  danger: [
    "{team} trycker på i straffområdet",
    "Farligt nu! {team} kombinerar sig in i boxen",
    "{team} slår in ett inlägg, det rör sig framför mål",
    "Det brinner i {opponentGen} straffområde",
  ],
  turnoverHigh: [
    "{team} vinner bollen högt och ställer om direkt",
    "Bollvinst för {team} långt upp i planen",
    "Slarv av {opponent}, {team} snappar åt sig bollen",
  ],
  foul: ["Frispark till {team} efter en foul", "Domaren blåser, foul på {team}"],
  summaryDominant: [
    "{team} har styrt senaste kvarten, {pct} % bollinnehav",
    "{team} äger bollen just nu, {pct} % senaste kvarten",
  ],
  summaryEven: [
    "Jämnt spel, {a}–{b} i bollinnehav senaste kvarten",
    "Ingen tar över, {a}–{b} i bollinnehav",
  ],
} as const satisfies TemplateSet<keyof typeof en>;
