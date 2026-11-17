import type { Rng } from "../engine";
import {
  DECLINE_PHYSICAL,
  DECLINE_TECHNICAL,
  GROWTH_FACTOR_HIGH,
  GROWTH_FACTOR_LOW,
  GROWTH_MAX_AGE,
  GROWTH_SHARES,
  KEEPER_ATTRIBUTES,
  MAX_CHANGE_PER_SEASON,
  MINUTES_HIGH,
  MINUTES_LOW,
  PHYSICAL_ATTRIBUTES,
  PLATEAU_DOWN_CHANCE,
  PLATEAU_MAX_AGE,
  PLATEAU_UP_CHANCE,
} from "./development-constants";
import {
  ATTRIBUTE_NAMES,
  type AttributeName,
  MAX_ATTRIBUTE,
  MIN_ATTRIBUTE,
  type Player,
} from "./player";
import { KEY_ATTRIBUTES, playerOverall } from "./player-overall";

/** One attribute of one player before and after the yearly development. */
export type AttributeChange = {
  playerId: string;
  attribute: AttributeName;
  before: number;
  after: number;
};

export type DevelopedPlayer = { player: Player; changes: AttributeChange[] };

/** 0.5 under 450 minutes rising linearly to 1.25 from 1,800 minutes. Scales growth only. */
export const playingTimeFactor = (minutes: number): number => {
  const share = (minutes - MINUTES_LOW) / (MINUTES_HIGH - MINUTES_LOW);
  const clamped = Math.min(1, Math.max(0, share));
  return GROWTH_FACTOR_LOW + clamped * (GROWTH_FACTOR_HIGH - GROWTH_FACTOR_LOW);
};

/** Share of the gap to potential closed in a season at this age (0 above `GROWTH_MAX_AGE`). */
export const growthShare = (age: number): number =>
  GROWTH_SHARES.find((band) => age <= band.maxAge)?.share ?? 0;

/** Expected loss of one attribute in a season at this age (0 up to `PLATEAU_MAX_AGE`). */
export const declineRate = (age: number, physical: boolean): number => {
  if (age <= PLATEAU_MAX_AGE) return 0;
  const { base, step } = physical ? DECLINE_PHYSICAL : DECLINE_TECHNICAL;
  return base + step * (age - PLATEAU_MAX_AGE - 1);
};

/** A whole number from an expected value: its integer part plus 1 with the chance of its fraction. */
const roundWith = (expected: number, draw: number): number => {
  const whole = Math.floor(expected);
  return whole + (draw < expected - whole ? 1 : 0);
};

const developedAttributes = (player: Player): readonly AttributeName[] =>
  player.position === "GK"
    ? KEEPER_ATTRIBUTES
    : ATTRIBUTE_NAMES.filter((name) => !KEEPER_ATTRIBUTES.includes(name));

/** The change of one attribute. Exactly one draw is used, whatever the age, so streams stay aligned. */
const attributeDelta = (
  player: Player,
  attribute: AttributeName,
  factor: number,
  draw: number,
): number => {
  if (player.age <= GROWTH_MAX_AGE) {
    const gap = Math.max(0, player.potential - playerOverall(player));
    return Math.min(MAX_CHANGE_PER_SEASON, roundWith(growthShare(player.age) * gap * factor, draw));
  }
  if (player.age <= PLATEAU_MAX_AGE) {
    if (draw < PLATEAU_UP_CHANCE * factor) return 1;
    return draw >= 1 - PLATEAU_DOWN_CHANCE ? -1 : 0;
  }
  const loss = declineRate(player.age, PHYSICAL_ATTRIBUTES.includes(attribute));
  return -Math.min(MAX_CHANGE_PER_SEASON, roundWith(loss, draw));
};

const clampAttribute = (value: number): number =>
  Math.min(MAX_ATTRIBUTE, Math.max(MIN_ATTRIBUTE, value));

/** Takes back increases of key attributes, the largest first, until the overall is within potential. */
const holdWithinPotential = (player: Player, increases: Map<AttributeName, number>): Player => {
  let current = player;
  const keys = KEY_ATTRIBUTES[player.position];
  while (playerOverall(current) > player.potential) {
    const raised = keys
      .filter((key) => (increases.get(key) ?? 0) > 0)
      .sort((a, b) => (increases.get(b) ?? 0) - (increases.get(a) ?? 0));
    const [largest] = raised;
    if (!largest) break;
    increases.set(largest, (increases.get(largest) ?? 0) - 1);
    current = { ...current, [largest]: current[largest] - 1 };
  }
  return current;
};

/**
 * One player a year older, with the attributes grown or declined by age, potential and the minutes
 * played. Pure: one draw per developed attribute from `rng`. Never raises the overall above potential.
 */
export const developPlayer = (player: Player, minutes: number, rng: Rng): DevelopedPlayer => {
  const factor = playingTimeFactor(minutes);
  const older: Player = { ...player, age: player.age + 1 };
  const increases = new Map<AttributeName, number>();
  let grown = older;
  for (const attribute of developedAttributes(older)) {
    const delta = attributeDelta(older, attribute, factor, rng.next());
    const value = clampAttribute(player[attribute] + delta);
    if (value > player[attribute]) increases.set(attribute, value - player[attribute]);
    grown = { ...grown, [attribute]: value };
  }
  const result = holdWithinPotential(grown, increases);
  const changes = ATTRIBUTE_NAMES.filter((name) => result[name] !== player[name]).map((name) => ({
    playerId: player.id,
    attribute: name,
    before: player[name],
    after: result[name],
  }));
  return { player: result, changes };
};
