import type { Rng } from "../engine";
import { generatePlayer } from "./generate-player";
import type { Player } from "./player";
import { generateName } from "./player-names";
import type { PlayerPosition } from "./squad-player";

export type SquadSpec = {
  clubId: string;
  /** 0..1, shifts the quality of every player in the squad. */
  strength: number;
};

/** 22 players: 3 GK, 7 DEF, 7 MID, 5 FWD. */
export const SQUAD_SHAPE: Record<PlayerPosition, number> = { GK: 3, DEF: 7, MID: 7, FWD: 5 };

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

/** Quality offset of the best and worst player of each position relative to the squad strength. */
const GRADIENT = 0.16;
const JITTER = 0.03;
/** Calibrated so the best eleven of a squad with strength 0.5 rates about 0.5 (see tests). */
const CENTRE = -0.13;

const qualityFor = (strength: number, rank: number, count: number, rng: Rng): number => {
  const spread = count > 1 ? 1 - (2 * rank) / (count - 1) : 0;
  const jitter = (rng.next() * 2 - 1) * JITTER;
  return Math.min(1, Math.max(0, strength + CENTRE + GRADIENT * spread + jitter));
};

const uniqueName = (taken: ReadonlySet<string>, name: string, rng: Rng): string => {
  let candidate = name;
  while (taken.has(candidate)) candidate = generateName(rng);
  return candidate;
};

/**
 * Generates a complete squad. Pass a stream forked per club (`rng.fork(clubId)`) so the result
 * does not depend on the order in which squads are generated.
 */
export const generateSquad = (spec: SquadSpec, rng: Rng): Player[] => {
  const names = new Set<string>();
  const squad: Player[] = [];
  for (const position of POSITIONS) {
    const count = SQUAD_SHAPE[position];
    for (let rank = 0; rank < count; rank++) {
      const quality = qualityFor(spec.strength, rank, count, rng);
      const player = generatePlayer(
        { position, quality },
        rng,
        `${spec.clubId}-${squad.length + 1}`,
      );
      const name = uniqueName(names, player.name, rng);
      names.add(name);
      squad.push({ ...player, name });
    }
  }
  return squad;
};
