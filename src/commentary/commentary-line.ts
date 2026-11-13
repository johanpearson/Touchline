import type { Side } from "../engine";

export type CommentaryKind =
  | "kickoff"
  | "goal"
  | "chance"
  | "corner"
  | "danger"
  | "turnover"
  | "foul"
  | "summary"
  | "halfTime"
  | "fullTime";

/** One line for the match feed. */
export type CommentaryLine = {
  /** Match time in seconds the line belongs to. */
  time: number;
  kind: CommentaryKind;
  /** The team the line is about; undefined for neutral lines (even-spell summaries, half-time, full time). */
  team: Side | undefined;
  /** "big" lines (goals, full time) are highlighted in the feed. */
  importance: "normal" | "big";
  text: string;
};
