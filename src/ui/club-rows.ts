import { type Player, type PlayerCondition, pickBestEleven, playerOverall } from "../game";

export type ClubSquadRow = {
  player: Player;
  overall: number;
  fitness: number;
  form: number;
  inBestEleven: boolean;
};

export type AttributeBand = "low" | "mid" | "high";

/** Low is 1-7, mid 8-13, high 14-20. The number is always shown next to the colour. */
export const attributeBandOf = (value: number): AttributeBand =>
  value <= 7 ? "low" : value <= 13 ? "mid" : "high";

/** Every player of a club with condition (default fitness 100, form 5) and the best-eleven mark. */
export const clubSquadRows = (
  players: readonly Player[],
  condition: Readonly<Record<string, PlayerCondition>>,
): ClubSquadRow[] => {
  const bestEleven = new Set(pickBestEleven(players).map((p) => p.id));
  return players.map((player) => ({
    player,
    overall: playerOverall(player),
    fitness: condition[player.id]?.fitness ?? 100,
    form: condition[player.id]?.form ?? 5,
    inBestEleven: bestEleven.has(player.id),
  }));
};
