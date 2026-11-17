import { createRng, type Rng } from "../engine";
import type { Career } from "./career";
import type { Club } from "./club";
import { initialClubStrengths } from "./generate-league";
import { generatePlayer } from "./generate-player";
import { SQUAD_SHAPE, uniqueName } from "./generate-squad";
import type { Player } from "./player";
import { initialCondition } from "./player-condition";
import { playerValue, wageFor } from "./player-value";
import { repairedSquadPlan } from "./repair-squad-plan";
import { MIN_PER_POSITION } from "./squad-limits";
import type { PlayerPosition } from "./squad-player";

export const YOUTH_PER_CLUB = 3;
export const YOUTH_MIN_AGE = 16;
export const YOUTH_MAX_AGE = 18;
/** Seasons a youth contract covers, counted from the next season. */
export const YOUTH_CONTRACT_SEASONS = 3;
/** Added to the club's initial strength to get the youth quality, so youth is weaker than the first team. */
export const YOUTH_QUALITY_OFFSET = -0.25;
/** Largest seeded shift of a club's youth quality (club level) and of each player (player level). */
export const YOUTH_CLUB_NOISE = 0.05;
export const YOUTH_PLAYER_NOISE = 0.04;

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];
const OUTFIELD: readonly PlayerPosition[] = ["DEF", "MID", "FWD"];

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const signedNoise = (rng: Rng, size: number): number => (rng.next() * 2 - 1) * size;

/** The quality (0..1) of a club's youth: a fixed function of its initial strength plus seeded noise. */
const youthQuality = (initialStrength: number, rng: Rng): number =>
  clamp01(initialStrength + YOUTH_QUALITY_OFFSET + signedNoise(rng, YOUTH_CLUB_NOISE));

const countsOf = (squad: readonly Player[]): Record<PlayerPosition, number> => {
  const counts: Record<PlayerPosition, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const player of squad) counts[player.position]++;
  return counts;
};

const largestBy = (
  positions: readonly PlayerPosition[],
  gap: (position: PlayerPosition) => number,
  rng: Rng,
): PlayerPosition => {
  const best = Math.max(...positions.map(gap));
  return rng.pick(positions.filter((position) => gap(position) === best));
};

/** The next position to fill: first a missing minimum, then a keeper for a club with 2, then the thinnest line. */
const nextPosition = (counts: Record<PlayerPosition, number>, rng: Rng): PlayerPosition => {
  const lacking = POSITIONS.filter((p) => counts[p] < MIN_PER_POSITION[p]);
  if (lacking.length > 0) {
    return largestBy(lacking, (p) => MIN_PER_POSITION[p] - counts[p], rng);
  }
  if (counts.GK < SQUAD_SHAPE.GK) return "GK";
  return largestBy(OUTFIELD, (p) => SQUAD_SHAPE[p] - counts[p], rng);
};

/** The positions of a club's youth, chosen to fill its thinnest lines. */
const youthPositions = (squad: readonly Player[], rng: Rng): PlayerPosition[] => {
  const counts = countsOf(squad);
  return Array.from({ length: YOUTH_PER_CLUB }, () => {
    const position = nextPosition(counts, rng);
    counts[position]++;
    return position;
  });
};

type YouthRequest = {
  club: Club;
  squad: readonly Player[];
  /** The club's initial strength, 0..1. */
  strength: number;
  season: number;
  rng: Rng;
};

const youthFor = ({ club, squad, strength, season, rng }: YouthRequest) => {
  const quality = youthQuality(strength, rng.fork("quality"));
  const taken = new Set(squad.map((p) => p.name));
  return youthPositions(squad, rng.fork("positions")).map((position, i): Player => {
    const id = `${club.id}-y${season}-${i + 1}`;
    const playerRng = rng.fork(id);
    const player = generatePlayer(
      {
        position,
        quality: clamp01(quality + signedNoise(playerRng.fork("quality"), YOUTH_PLAYER_NOISE)),
        age: playerRng.fork("age").int(YOUTH_MIN_AGE, YOUTH_MAX_AGE),
      },
      playerRng,
      id,
    );
    const name = uniqueName(taken, player.name, playerRng.fork("name"));
    taken.add(name);
    return { ...player, name };
  });
};

/**
 * Gives every club three youth players, joining the squad directly on a contract of three
 * seasons from the next one (`season.number + 1`). Positions fill the club's thinnest lines (a
 * missing minimum first, a keeper for a club with only two); quality follows the club's initial
 * strength, so strong clubs tend to get better youth. Every club draws from its own stream of
 * `createRng(seed).fork("youth-<season>")`, so one club's squad never changes another's youth.
 * Finances are unchanged (wages start at the next rollover). Call it after `retirePlayers`.
 */
export const generateYouthIntake = (career: Career): Career => {
  const season = career.season.number;
  const rng = createRng(career.seed).fork(`youth-${season}`);
  const strengths = initialClubStrengths(career.seed, career.league.clubs.length);
  const joined = career.league.clubs.map((club, index) => {
    const squad = career.league.players.filter((p) => club.playerIds.includes(p.id));
    return youthFor({
      club,
      squad,
      strength: strengths[index] as number,
      season,
      rng: rng.fork(club.id),
    });
  });
  const players = joined.flat();
  const contracts = Object.fromEntries(
    players.map((player) => {
      const expiresSeason = season + YOUTH_CONTRACT_SEASONS;
      return [
        player.id,
        { wage: wageFor(playerValue(player, { expiresSeason }, season + 1)), expiresSeason },
      ];
    }),
  );
  const next: Career = {
    ...career,
    league: {
      ...career.league,
      clubs: career.league.clubs.map((club, i) => ({
        ...club,
        playerIds: [...club.playerIds, ...(joined[i] ?? []).map((p) => p.id)],
      })),
      players: [...career.league.players, ...players],
    },
    contracts: { ...career.contracts, ...contracts },
    condition: {
      ...career.condition,
      ...Object.fromEntries(players.map((p) => [p.id, initialCondition()])),
    },
    minutes: { ...career.minutes, ...Object.fromEntries(players.map((p) => [p.id, 0])) },
  };
  return { ...next, squadPlan: repairedSquadPlan(next) };
};
