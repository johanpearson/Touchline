import type { ReactNode } from "react";
import { MAX_ATTRIBUTE } from "../../game";
import type { Locale, Translator } from "../../i18n";
import type { Column } from "../components";
import { formatMoney } from "../money-format";
import { PotentialStars } from "../potential-stars";
import { hrefFor } from "../routes";
import { Gauge } from "../squad-columns";
import type { MarketRow } from "./market-rows";

const POSITION_RANK = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

/** Ties in any sort fall back to line order, then id, so the order is stable. */
export const marketTieBreak = (row: MarketRow): string =>
  `${POSITION_RANK[row.player.position]}:${row.player.id}`;

export type MarketColumnContext = Pick<Translator, "t" | "formatNumber"> & {
  locale: Locale;
  /** The button of a row: buy or sign. */
  action: (row: MarketRow) => ReactNode;
  /** Shows the selling club column (the free-agent list has none). */
  showClub: boolean;
};

const numberColumn = (
  id: string,
  header: string,
  priority: 1 | 2 | 3,
  value: (row: MarketRow) => number,
  cell: (row: MarketRow) => ReactNode,
): Column<MarketRow> => ({ id, header, priority, align: "end", sortValue: value, cell });

/** The market table: player, position, club, age, potential, overall, value, price, wage and the action. */
export function marketColumns(ctx: MarketColumnContext): Column<MarketRow>[] {
  const { t, formatNumber, locale } = ctx;
  const money = (value: number) => formatMoney(value, locale);
  const club: Column<MarketRow>[] = ctx.showClub
    ? [
        {
          id: "club",
          header: t("market.col.club"),
          priority: 2,
          sortValue: (row) => row.clubName ?? "",
          cell: (row) => row.clubName,
        },
      ]
    : [];
  return [
    {
      id: "name",
      header: t("squad.col.name"),
      priority: 1,
      primary: true,
      sortValue: (row) => row.player.name,
      cell: (row) => (
        <a
          data-testid={`market-player-${row.player.id}`}
          href={hrefFor({ name: "player", playerId: row.player.id })}
        >
          {row.player.name}
        </a>
      ),
    },
    {
      id: "position",
      header: t("squad.col.position"),
      priority: 1,
      sortValue: (row) => POSITION_RANK[row.player.position],
      cell: (row) => t(`position.short.${row.player.position}`),
    },
    ...club,
    numberColumn(
      "age",
      t("squad.col.age"),
      2,
      (row) => row.player.age,
      (row) => formatNumber(row.player.age, 0),
    ),
    numberColumn(
      "potential",
      t("squad.col.potential"),
      2,
      (row) => row.potentialStars,
      (row) => <PotentialStars playerId={row.player.id} stars={row.potentialStars} t={t} />,
    ),
    numberColumn(
      "overall",
      t("squad.col.overall"),
      1,
      (row) => row.overall,
      (row) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span>{formatNumber(row.overall, 1)}</span>
          <Gauge value={(row.overall / MAX_ATTRIBUTE) * 100} colour="var(--accent)" />
        </span>
      ),
    ),
    numberColumn(
      "value",
      t("squad.col.value"),
      2,
      (row) => row.value,
      (row) => money(row.value),
    ),
    numberColumn(
      "fee",
      t("market.col.fee"),
      1,
      (row) => row.fee,
      (row) => <span data-testid={`market-fee-${row.player.id}`}>{money(row.fee)}</span>,
    ),
    numberColumn(
      "wage",
      t("market.col.wageAsked"),
      2,
      (row) => row.wage,
      (row) => <span data-testid={`market-wage-${row.player.id}`}>{money(row.wage)}</span>,
    ),
    {
      id: "action",
      header: t("market.col.action"),
      priority: 1,
      align: "end",
      cell: ctx.action,
    },
  ];
}
