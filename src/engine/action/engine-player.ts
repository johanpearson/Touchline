/** The twelve player attributes the engine reads. Same names as `ATTRIBUTE_NAMES` in `game` (a test keeps them in sync). */
export const ENGINE_ATTRIBUTE_NAMES = [
  "passing",
  "ballControl",
  "dribbling",
  "pace",
  "vision",
  "finishing",
  "workRate",
  "tackling",
  "positioning",
  "strength",
  "handling",
  "reflexes",
] as const;

export type EngineAttributeName = (typeof ENGINE_ATTRIBUTE_NAMES)[number];

export type EngineAttributes = Record<EngineAttributeName, number>;

export const MIN_ENGINE_ATTRIBUTE = 1;
export const MAX_ENGINE_ATTRIBUTE = 20;

export type EnginePosition = "GK" | "DEF" | "MID" | "FWD";

/** A player as the engine sees one: an opaque id and effective attributes (1 to 20). Names stay in `game`. */
export type EnginePlayer = {
  id: string;
  position: EnginePosition;
  attributes: EngineAttributes;
};
