import type { Career, Player } from "../../game";
import { orderedStarters, slotRating } from "./lineup-model";
import { type PitchSlot, pitchSlots } from "./pitch-layout";

/** `rating` is the effective rating at the slot's position (1..20); `fitness` is the energy, 0 to 100. */
export type StarterSlot = PitchSlot & {
  index: number;
  player: Player;
  fitness: number;
  rating: number;
};
export type BenchSlot = { index: number; player: Player; fitness: number; rating: number };

const FULL_FITNESS = 100;

const fitnessOf = (career: Career, id: string): number =>
  Math.round(career.condition[id]?.fitness ?? FULL_FITNESS);

/** The eleven starters placed in their formation slots, in plan order (goalkeeper to attack). */
export const starterSlots = (career: Career, byId: ReadonlyMap<string, Player>): StarterSlot[] => {
  const layout = pitchSlots(career.squadPlan.formation);
  return orderedStarters(career.squadPlan.starters, byId).flatMap((id, index) => {
    const player = byId.get(id);
    const place = layout[index];
    return player && place
      ? [
          {
            ...place,
            index,
            player,
            fitness: fitnessOf(career, id),
            rating: slotRating(player, place.line, career.condition[id]),
          },
        ]
      : [];
  });
};

/** The bench in plan order. */
export const benchSlots = (career: Career, byId: ReadonlyMap<string, Player>): BenchSlot[] =>
  career.squadPlan.bench.flatMap((id, index) => {
    const player = byId.get(id);
    return player
      ? [
          {
            index,
            player,
            fitness: fitnessOf(career, id),
            rating: slotRating(player, player.position, career.condition[id]),
          },
        ]
      : [];
  });

/** The surname for a label on the pitch: the last word of the name. */
export const surname = (name: string): string => name.split(" ").at(-1) ?? name;
