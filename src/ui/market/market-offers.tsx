import { useState } from "react";
import { Button, type Column, ConfirmDialog, DataTable, EmptyState } from "../components";
import { useI18n } from "../i18n-provider";
import { formatMoney } from "../money-format";
import { hrefFor } from "../routes";
import { useDensity } from "../theme/density-provider";
import type { OfferRow, OwnPlayerRow } from "./market-rows";

export type MarketOffersProps = {
  offers: readonly OfferRow[];
  own: readonly OwnPlayerRow[];
  /** Why accepting is disabled, already translated, or null. */
  blockedText: string | null;
  onAccept: (offerId: string) => void;
  onRelease: (playerId: string) => void;
};

/** Incoming offers (accept) and the user's own players (release, after a confirmation). */
export function MarketOffers(props: MarketOffersProps) {
  const { t, formatNumber, locale } = useI18n();
  const { density } = useDensity();
  const [releasing, setReleasing] = useState<OwnPlayerRow | null>(null);
  const money = (value: number) => formatMoney(value, locale);
  const labels = {
    sortBy: t("squad.sort.by"),
    ascending: t("squad.sort.ascending"),
    descending: t("squad.sort.descending"),
  };
  const nameColumn = <Row extends { player: { id: string; name: string } }>(): Column<Row> => ({
    id: "name",
    header: t("squad.col.name"),
    priority: 1,
    primary: true,
    sortValue: (row) => row.player.name,
    cell: (row) => (
      <a href={hrefFor({ name: "player", playerId: row.player.id })}>{row.player.name}</a>
    ),
  });

  const offerColumns: Column<OfferRow>[] = [
    nameColumn<OfferRow>(),
    {
      id: "club",
      header: t("market.col.offerFrom"),
      priority: 1,
      sortValue: (row) => row.clubName,
      cell: (row) => row.clubName,
    },
    {
      id: "overall",
      header: t("squad.col.overall"),
      priority: 2,
      align: "end",
      sortValue: (row) => row.overall,
      cell: (row) => formatNumber(row.overall, 1),
    },
    {
      id: "value",
      header: t("squad.col.value"),
      priority: 2,
      align: "end",
      sortValue: (row) => row.value,
      cell: (row) => money(row.value),
    },
    {
      id: "fee",
      header: t("market.col.offerFee"),
      priority: 1,
      align: "end",
      sortValue: (row) => row.offer.fee,
      cell: (row) => money(row.offer.fee),
    },
    {
      id: "action",
      header: t("market.col.action"),
      priority: 1,
      align: "end",
      cell: (row) => (
        <Button
          variant="secondary"
          disabled={props.blockedText !== null}
          data-testid={`offer-accept-${row.offer.id}`}
          aria-label={t("market.accept.aria", { name: row.player.name })}
          onClick={() => props.onAccept(row.offer.id)}
        >
          {t("market.accept")}
        </Button>
      ),
    },
  ];

  const ownColumns: Column<OwnPlayerRow>[] = [
    nameColumn<OwnPlayerRow>(),
    {
      id: "position",
      header: t("squad.col.position"),
      priority: 1,
      sortValue: (row) => row.player.position,
      cell: (row) => t(`position.short.${row.player.position}`),
    },
    {
      id: "overall",
      header: t("squad.col.overall"),
      priority: 1,
      align: "end",
      sortValue: (row) => row.overall,
      cell: (row) => formatNumber(row.overall, 1),
    },
    {
      id: "wage",
      header: t("squad.col.wage"),
      priority: 2,
      align: "end",
      sortValue: (row) => row.wage,
      cell: (row) => money(row.wage),
    },
    {
      id: "contract",
      header: t("squad.col.contract"),
      priority: 2,
      align: "end",
      sortValue: (row) => row.contractEnd,
      cell: (row) => t("squad.contractEnd", { season: row.contractEnd }),
    },
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
          onClick={() => setReleasing(row)}
        >
          {t("market.release")}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="market-offers-title" className="flex flex-col gap-3">
        <h3 id="market-offers-title" className="m-0 font-heading text-xl text-text">
          {t("market.offers.title")}
        </h3>
        {props.blockedText ? (
          <p role="status" data-testid="offers-blocked" className="m-0 text-muted">
            {props.blockedText}
          </p>
        ) : null}
        <DataTable
          label={t("market.table.offers")}
          columns={offerColumns}
          rows={props.offers}
          rowKey={(row) => row.offer.id}
          rowAttributes={(row) => ({ "data-testid": `offer-row-${row.offer.id}` })}
          labels={labels}
          density={density}
          locale={locale}
          empty={
            <EmptyState
              data-testid="offers-empty"
              title={t("market.offers.empty.title")}
              text={t("market.offers.empty.hint")}
            />
          }
        />
      </section>
      <section aria-labelledby="market-own-title" className="flex flex-col gap-3">
        <h3 id="market-own-title" className="m-0 font-heading text-xl text-text">
          {t("market.own.title")}
        </h3>
        <DataTable
          label={t("market.table.own")}
          columns={ownColumns}
          rows={props.own}
          rowKey={(row) => row.player.id}
          rowAttributes={(row) => ({ "data-testid": `own-row-${row.player.id}` })}
          labels={labels}
          density={density}
          locale={locale}
          defaultSort={{ id: "overall", direction: "asc" }}
        />
      </section>
      {releasing ? (
        <ConfirmDialog
          open
          destructive
          onOpenChange={(open) => !open && setReleasing(null)}
          title={t("market.release.title", { name: releasing.player.name })}
          description={t("market.release.description", { name: releasing.player.name })}
          confirmLabel={t("market.release.confirm")}
          cancelLabel={t("market.dialog.cancel")}
          closeLabel={t("market.dialog.close")}
          confirmTestId="confirm-release"
          onConfirm={() => {
            props.onRelease(releasing.player.id);
            setReleasing(null);
          }}
        />
      ) : null}
    </div>
  );
}
