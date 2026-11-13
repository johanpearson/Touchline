import type { MatchInput, PerSide } from "../engine";

/** A fixed fictional fixture shown until the career and league screens exist. */
export const demoMatch: {
  input: MatchInput;
  seed: number;
  colours: PerSide<string>;
  players: PerSide<readonly string[]>;
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
  players: {
    home: ["Elias Berg", "Oskar Lind", "Nils Falk"],
    away: ["Viktor Strand", "Anton Hed", "Leo Sand"],
  },
};
