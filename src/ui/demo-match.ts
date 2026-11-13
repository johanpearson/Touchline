import type { MatchInput, PerSide } from "../engine";
import type { SquadPlayer } from "../game";

/** A fixed fictional fixture shown until the career and league screens exist. */
export const demoMatch: {
  input: MatchInput;
  seed: number;
  colours: PerSide<string>;
  squads: PerSide<readonly SquadPlayer[]>;
} = {
  input: {
    home: {
      name: "Kvarnby",
      buildUp: 0.55,
      progression: 0.55,
      chanceCreation: 0.5,
      finishing: 0.5,
      pressing: 0.5,
      defending: 0.5,
      goalkeeping: 0.5,
    },
    away: {
      name: "Västerås Park",
      buildUp: 0.5,
      progression: 0.5,
      chanceCreation: 0.5,
      finishing: 0.5,
      pressing: 0.5,
      defending: 0.5,
      goalkeeping: 0.5,
    },
    homeTactics: {},
    awayTactics: {},
  },
  seed: 2026,
  colours: { home: "#ff4b5c", away: "#2f9bff" },
  squads: {
    home: [
      { name: "Elias Berg", position: "FWD", finishing: 0.7 },
      { name: "Oskar Lind", position: "MID", finishing: 0.55 },
      { name: "Nils Falk", position: "DEF", finishing: 0.4 },
    ],
    away: [
      { name: "Viktor Strand", position: "FWD", finishing: 0.65 },
      { name: "Anton Hed", position: "MID", finishing: 0.55 },
      { name: "Leo Sand", position: "DEF", finishing: 0.4 },
    ],
  },
};
