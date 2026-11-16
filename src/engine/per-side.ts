import type { Side } from "./match-state";

/** A value for each team. */
export type PerSide<T> = Record<Side, T>;
