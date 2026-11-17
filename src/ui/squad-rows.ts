import {
  type AttributeChange,
  type AttributeName,
  type Career,
  marketValue,
  wageBill,
  wageBudget,
} from "../game";
import { DEFAULT_PLAN_SORT, type PlanRow, planRows } from "./plan-rows";

export type SquadRow = PlanRow & {
  age: number;
  /** 1 to 5. */
  potentialStars: number;
  /** The last season the contract covers. */
  contractEnd: number;
  wage: number;
  value: number;
  minutes: number;
};

const STAR_STEP = 4;

/** Potential 1 to 20 as 1 to 5 stars: 1-4 is one star, 5-8 two, 9-12 three, 13-16 four, 17-20 five. */
export const potentialStars = (potential: number): number =>
  Math.min(5, Math.max(1, Math.ceil(potential / STAR_STEP)));

/** The user's players with the data of the squad table. Ties and order follow `planRows`. */
export const squadRows = (career: Career): SquadRow[] => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const ids = new Set(club?.playerIds);
  const players = career.league.players.filter((p) => ids.has(p.id));
  return planRows(players, career.squadPlan, career.condition, DEFAULT_PLAN_SORT).map((row) => {
    const contract = career.contracts[row.player.id] ?? {
      wage: 0,
      expiresSeason: career.season.number,
    };
    return {
      ...row,
      age: row.player.age,
      potentialStars: potentialStars(row.player.potential),
      contractEnd: contract.expiresSeason,
      wage: contract.wage,
      value: marketValue(career, row.player.id) ?? 0,
      minutes: career.minutes[row.player.id] ?? 0,
    };
  });
};

/** One player's attribute changes of the last development, `after - before`, changed attributes only. */
export const developmentOf = (
  changes: readonly AttributeChange[] | undefined,
  playerId: string,
): Partial<Record<AttributeName, number>> => {
  const deltas: Partial<Record<AttributeName, number>> = {};
  for (const change of changes ?? []) {
    if (change.playerId === playerId) deltas[change.attribute] = change.after - change.before;
  }
  return deltas;
};

export type SquadFinance = {
  balance: number;
  wageBill: number;
  wageBudget: number;
  overBudget: boolean;
  negativeBalance: boolean;
};

/** The user's club money with the two warning conditions. */
export const squadFinance = (career: Career): SquadFinance => {
  const finance = career.finances[career.userClubId] ?? { balance: 0, baseIncome: 0 };
  const bill = wageBill(career, career.userClubId);
  const budget = wageBudget(finance);
  return {
    balance: finance.balance,
    wageBill: bill,
    wageBudget: budget,
    overBudget: bill > budget,
    negativeBalance: finance.balance < 0,
  };
};
