import type { ActionEvent } from "../engine";

/** The player id who scored each goal of an action log, in the order the goals were scored. */
export const goalScorersOf = (events: readonly ActionEvent[]): string[] =>
  events.flatMap((e) => (e.type === "shot" && e.outcome === "goal" ? [e.actor] : []));
