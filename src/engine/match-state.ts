/** Which side of the match a team plays on. */
export type Side = "home" | "away";

/** Phase of the match. Time only advances in the playing periods. */
export type Period = "firstHalf" | "halfTime" | "secondHalf" | "fullTime";

/** Normalised position on the pitch. x runs from the home goal (0) to the away goal (1), y across the width. */
export type PitchPosition = { x: number; y: number };
