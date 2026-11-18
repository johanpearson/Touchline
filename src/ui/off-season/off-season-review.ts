import {
  type AttributeChange,
  type Career,
  type Player,
  playerOverall,
  type RetiredPlayer,
} from "../../game";

/** A player of the user's club whose overall changed at the rollover. */
export type Mover = { player: Player; before: number; after: number; delta: number };

export type SeasonMoney = { income: number; wages: number; balance: number };

export type OffSeasonReview = {
  /** Biggest gains first (overall change above zero), ties by name. */
  risers: Mover[];
  /** Biggest losses first (overall change below zero), ties by name. */
  fallers: Mover[];
  retired: RetiredPlayer[];
  /** The youth players who joined at the rollover, in squad order. */
  youth: Player[];
  /** Null when the career has no rollover record (an old save). */
  money: SeasonMoney | null;
};

/** How many risers and fallers the review lists. */
export const MOVERS_SHOWN = 5;

const withoutChanges = (player: Player, changes: readonly AttributeChange[]): Player => {
  const before: Player = { ...player };
  for (const change of changes) before[change.attribute] = change.before;
  return before;
};

const byName = (a: Mover, b: Mover): number =>
  a.player.name < b.player.name ? -1 : a.player.name > b.player.name ? 1 : 0;

/** Biggest gain first, ties by name. */
const risersFirst = (a: Mover, b: Mover): number => b.delta - a.delta || byName(a, b);

/** Biggest loss first, ties by name. */
const fallersFirst = (a: Mover, b: Mover): number => a.delta - b.delta || byName(a, b);

/** The overall change of one player over the development, or undefined when he had no change. */
const moverOf = (player: Player, changes: readonly AttributeChange[]): Mover | undefined => {
  const after = playerOverall(player);
  const before = playerOverall(withoutChanges(player, changes));
  return before === after ? undefined : { player, before, after, delta: after - before };
};

const changesByPlayer = (list: readonly AttributeChange[]): Map<string, AttributeChange[]> => {
  const grouped = new Map<string, AttributeChange[]>();
  for (const change of list)
    grouped.set(change.playerId, [...(grouped.get(change.playerId) ?? []), change]);
  return grouped;
};

/** The user's current squad as players. */
const squadOf = (career: Career): Player[] => {
  const ids = new Set(career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds);
  return career.league.players.filter((p) => ids.has(p.id));
};

const moversOf = (career: Career): Mover[] => {
  const grouped = changesByPlayer(career.lastDevelopment ?? []);
  return squadOf(career).flatMap((player) => {
    const mover = moverOf(player, grouped.get(player.id) ?? []);
    return mover ? [mover] : [];
  });
};

const youthOf = (career: Career): Player[] => {
  const prefix = `${career.userClubId}-y${career.season.number}-`;
  return squadOf(career).filter((p) => p.id.startsWith(prefix));
};

/**
 * What the off-season review shows, all from the finished rollover: the user's biggest risers and
 * fallers by overall change (from `lastDevelopment`), his retired players, the new youth players
 * and the money of the season just played (`lastRollover`, with the balance as it is now).
 */
export const offSeasonReview = (career: Career): OffSeasonReview => {
  const movers = moversOf(career);
  const record = career.lastRollover;
  const balance = career.finances[career.userClubId]?.balance ?? 0;
  return {
    risers: movers
      .filter((m) => m.delta > 0)
      .sort(risersFirst)
      .slice(0, MOVERS_SHOWN),
    fallers: movers
      .filter((m) => m.delta < 0)
      .sort(fallersFirst)
      .slice(0, MOVERS_SHOWN),
    retired: record?.retired ?? [],
    youth: youthOf(career),
    money: record ? { income: record.income, wages: record.wages, balance } : null,
  };
};
