import type { Rng } from "../engine";
import {
  ATTRIBUTE_NAMES,
  type AttributeName,
  MAX_ATTRIBUTE,
  MIN_ATTRIBUTE,
  type Player,
} from "./player";
import { generateName } from "./player-names";
import type { PlayerPosition } from "./squad-player";

export type PlayerSpec = {
  position: PlayerPosition;
  /** 0..1, sets the mean of the attributes. */
  quality: number;
  /** Defaults to a random age from 17 to 36. */
  age?: number;
};

/** Attribute points added to the quality-based base value, per position. */
const OFFSETS: Record<PlayerPosition, Partial<Record<AttributeName, number>>> = {
  GK: {
    handling: 2,
    reflexes: 2,
    passing: -6,
    ballControl: -7,
    dribbling: -9,
    pace: -7,
    vision: -6,
    finishing: -10,
    workRate: -4,
    tackling: -9,
    positioning: -2,
    strength: -3,
  },
  DEF: { tackling: 3, positioning: 3, strength: 2, finishing: -4, dribbling: -2, vision: -1 },
  MID: { passing: 2, vision: 2, ballControl: 2, workRate: 2, finishing: -1, strength: -1 },
  FWD: { finishing: 4, dribbling: 2, pace: 2, tackling: -4, positioning: -1, workRate: -1 },
};

const NOISE = 2;
const MIN_AGE = 17;
const MAX_AGE = 36;

const clamp = (value: number): number =>
  Math.min(MAX_ATTRIBUTE, Math.max(MIN_ATTRIBUTE, Math.round(value)));

const attributeValue = (
  name: AttributeName,
  position: PlayerPosition,
  quality: number,
  rng: Rng,
): number => {
  const noise = rng.int(-NOISE, NOISE);
  const isKeeperSkill = name === "handling" || name === "reflexes";
  if (isKeeperSkill && position !== "GK") return clamp(1 + quality * 3 + rng.int(0, 1));
  const base = MIN_ATTRIBUTE + quality * (MAX_ATTRIBUTE - MIN_ATTRIBUTE);
  return clamp(base + (OFFSETS[position][name] ?? 0) + noise);
};

/** Ages cluster in the mid twenties: the mean of two uniform draws gives a triangular spread. */
const randomAge = (rng: Rng): number =>
  Math.round((rng.int(MIN_AGE, MAX_AGE) + rng.int(MIN_AGE, MAX_AGE)) / 2);

/** Generates one fictional player. Deterministic for the same rng state. */
export const generatePlayer = (spec: PlayerSpec, rng: Rng, id: string): Player => {
  const quality = Math.min(1, Math.max(0, spec.quality));
  const attributes = Object.fromEntries(
    ATTRIBUTE_NAMES.map((name) => [name, attributeValue(name, spec.position, quality, rng)]),
  ) as Record<AttributeName, number>;
  return {
    id,
    name: generateName(rng),
    age: spec.age ?? randomAge(rng),
    position: spec.position,
    ...attributes,
  };
};
