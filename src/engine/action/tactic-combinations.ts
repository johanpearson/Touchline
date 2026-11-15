import type { Mentality, Pressing, TeamTactics, Tempo, Width } from "../tactics";

export const MENTALITIES: readonly Mentality[] = ["defensive", "balanced", "attacking"];
const PRESSINGS: readonly Pressing[] = ["low", "medium", "high"];
const WIDTHS: readonly Width[] = ["narrow", "normal", "wide"];
const TEMPOS: readonly Tempo[] = ["slow", "normal", "fast"];

/** The 27 combinations of pressing, width and tempo for one mentality. */
export const combinationsFor = (mentality: Mentality): TeamTactics[] =>
  PRESSINGS.flatMap((pressing) =>
    WIDTHS.flatMap((width) => TEMPOS.map((tempo) => ({ mentality, pressing, width, tempo }))),
  );

export const labelOf = (t: TeamTactics): string =>
  `${t.mentality}/${t.pressing}/${t.width}/${t.tempo}`;
