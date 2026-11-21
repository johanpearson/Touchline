import type { ActionEvent } from "../action/action-event";

type WithoutPresentation<E> = E extends ActionEvent
  ? Omit<E, "time" | "pressure" | "snapshot">
  : never;

/** An action event before its time, pressure and snapshot are drawn. */
export type DraftEvent = WithoutPresentation<ActionEvent>;
