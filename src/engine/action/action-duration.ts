import type { Rng } from "../rng";
import { NEUTRAL_TACTICS, type Tempo } from "../tactics";
import type { ActionEventType } from "./action-event";
import { ACTION_MAX_SECONDS, ACTION_MIN_SECONDS } from "./decision-constants";
import { actionTactics } from "./tactics-parameters";

/** Seconds an action takes: 2 to 4, one decimal. Fast tempo skews short, slow tempo long. One draw. */
export const actionDuration = (_type: ActionEventType, tempo: Tempo, rng: Rng): number => {
  const skewed = rng.next() ** actionTactics({ ...NEUTRAL_TACTICS, tempo }).tempoExponent;
  const seconds = ACTION_MIN_SECONDS + (ACTION_MAX_SECONDS - ACTION_MIN_SECONDS) * skewed;
  return Math.round(seconds * 10) / 10;
};
