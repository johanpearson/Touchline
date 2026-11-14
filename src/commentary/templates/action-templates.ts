import type { Locale } from "../../i18n";
import { actionEn } from "./action-en";
import { actionSv } from "./action-sv";

export type ActionTemplateKey = keyof typeof actionEn;

export const actionTemplates: Record<Locale, Record<ActionTemplateKey, readonly string[]>> = {
  en: actionEn,
  sv: actionSv,
};

const NAMES = ["team", "opponent", "opponentGen", "score"] as const;
const PLAYER = ["player", "playerGen"] as const;

/** The placeholders the generator fills for each template key; a test keeps the templates inside this list. */
export const actionTemplateParams: Record<ActionTemplateKey, readonly string[]> = {
  kickoff: NAMES,
  secondHalfKickoff: NAMES,
  halfTime: NAMES,
  fullTime: NAMES,
  goal: [...NAMES, ...PLAYER],
  goalAssist: [...NAMES, ...PLAYER, "passer", "passerGen"],
  penaltyAwarded: [...NAMES, ...PLAYER, "offender"],
  penaltyGoal: [...NAMES, ...PLAYER],
  penaltySaved: [...NAMES, ...PLAYER, "keeper"],
  penaltyMissed: [...NAMES, ...PLAYER],
  bigSave: [...NAMES, ...PLAYER, "keeper"],
  save: [...NAMES, ...PLAYER, "keeper"],
  blocked: [...NAMES, ...PLAYER],
  wide: [...NAMES, ...PLAYER],
  woodwork: [...NAMES, ...PLAYER],
  bigMiss: [...NAMES, ...PLAYER],
  keyPass: [...NAMES, ...PLAYER, "passer"],
  throughBall: [...NAMES, ...PLAYER, "passer"],
  tackleStop: [...NAMES, ...PLAYER, "opponentPlayer"],
  interceptionStop: [...NAMES, ...PLAYER],
  foul: [...NAMES, ...PLAYER, "offender"],
  corner: [...NAMES, ...PLAYER],
  freeKick: [...NAMES, ...PLAYER],
  throwIn: [...NAMES, ...PLAYER],
  goalKick: [...NAMES, ...PLAYER],
  summaryDominant: [...NAMES, "pct"],
  summaryEven: [...NAMES, "a", "b"],
};
