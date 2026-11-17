import type { Career } from "./career";

/** True while transfers between clubs are allowed: after the season summary, before the next season. */
export const isWindowOpen = (career: Career): boolean => career.window === "open";
