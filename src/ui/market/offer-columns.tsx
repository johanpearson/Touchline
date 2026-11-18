import type { ReactNode } from "react";
import type { Locale, Translator } from "../../i18n";
import type { Column } from "../components";
import { Button } from "../components";
import { formatMoney } from "../money-format";
import { hrefFor } from "../routes";
import type { OfferRow, OwnPlayerRow } from "./market-rows";

export type OfferColumnContext = Pick<Translator, "t" | "formatNumber"> & {
  locale: Locale;
  /** True when accepting is disabled (the window is closed). */
  acceptBlocked: boolean;
  onAccept: (offerId: string) => void;
  onRelease: (row: OwnPlayerRow) => void;
};

const nameColumn = <Row extends { player: { id: string; name: string } }>(
  header: string,
): Column<Row> => ({
  id: "name",
  header,
  priority: 1,
  primary: true,
  sortValue: (row) => row.player.name,
  cell: (row) => (
    <a href={hrefFor({ name: "player", playerId: row.player.id })}>{row.player.name}</a>
  ),
});

const numberColumn = <Row,>(
  id: string,
  header: string,
  priority: 1 | 2,
  value: (row: Row) => number,
  cell: (row: Row) => ReactNode,
): Column<Row> => ({ id, header, priority, align: "end", sortValue: value, cell });

/** Columns of the incoming offers table. */
export function offerColumns(ctx: OfferColumnContext): Column<OfferRow>[] {
  const { t, formatNumber, locale } = ctx;
  const money = (value: number) => formatMoney(value, locale);
  return [
    nameColumn<OfferRow>(t("squad.col.name")),
    {
      id: "club",
      header: t("market.col.offerFrom"),
      priority: 1,
      sortValue: (row) => row.clubName,
      cell: (row) => row.clubName,
    },
    numberColumn(
      "overall",
      t("squad.col.overall"),
      2,
      (row: OfferRow) => row.overall,
      (row) => formatNumber(row.overall, 1),
    ),
    numberColumn(
      "value",
      t("squad.col.value"),
      2,
      (row: OfferRow) => row.value,
      (row) => money(row.value),
    ),
    numberColumn(
      "fee",
      t("market.col.offerFee"),
      1,
      (row: OfferRow) => row.offer.fee,
      (row) => money(row.offer.fee),
    ),
    {
      id: "action",
      header: t("market.col.action"),
      priority: 1,
      align: "end",
      cell: (row) => (
        <Button
          variant="secondary"
          disabled={ctx.acceptBlocked}
          data-testid={`offer-accept-${row.offer.id}`}
          aria-label={t("market.accept.aria", { name: row.player.name })}
          onClick={() => ctx.onAccept(row.offer.id)}
        >
          {t("market.accept")}
        </Button>
      ),
    },
  ];
}

/** Columns of the table of the user's own players, with the release button. */
export function ownColumns(ctx: OfferColumnContext): Column<OwnPlayerRow>[] {
  const { t, formatNumber, locale } = ctx;
  return [
    nameColumn<OwnPlayerRow>(t("squad.col.name")),
    {
      id: "position",
      header: t("squad.col.position"),
      priority: 1,
      sortValue: (row) => row.player.position,
      cell: (row) => t(`position.short.${row.player.position}`),
    },
    numberColumn(
      "overall",
      t("squad.col.overall"),
      1,
      (row: OwnPlayerRow) => row.overall,
      (row) => formatNumber(row.overall, 1),
    ),
    numberColumn(
      "wage",
      t("squad.col.wage"),
      2,
      (row: OwnPlayerRow) => row.wage,
      (row) => formatMoney(row.wage, locale),
    ),
    numberColumn(
      "contract",
      t("squad.col.contract"),
      2,
      (row: OwnPlayerRow) => row.contractEnd,
      (row) => t("squad.contractEnd", { season: row.contractEnd }),
    ),
    {
      id: "action",
      header: t("market.col.action"),
      priority: 1,
      align: "end",
      cell: (row) => (
        <Button
          variant="destructive"
          data-testid={`release-${row.player.id}`}
          aria-label={t("market.release.aria", { name: row.player.name })}
          onClick={() => ctx.onRelease(row)}
        >
          {t("market.release")}
        </Button>
      ),
    },
  ];
}
