import { useState } from "react";
import { ConfirmDialog, DataTable, EmptyState } from "../components";
import { useI18n } from "../i18n-provider";
import { useDensity } from "../theme/density-provider";
import type { OfferRow, OwnPlayerRow } from "./market-rows";
import { offerColumns, ownColumns } from "./offer-columns";

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
  const labels = {
    sortBy: t("squad.sort.by"),
    ascending: t("squad.sort.ascending"),
    descending: t("squad.sort.descending"),
  };
  const context = {
    t,
    formatNumber,
    locale,
    acceptBlocked: props.blockedText !== null,
    onAccept: props.onAccept,
    onRelease: setReleasing,
  };
  const offerCols = offerColumns(context);
  const ownCols = ownColumns(context);
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
          columns={offerCols}
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
          columns={ownCols}
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
