import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { Career, TransferError } from "../../game";
import { Card, Tabs, TabsContent, TabsList, TabsTrigger } from "../components";
import { useI18n } from "../i18n-provider";
import { formatMoney } from "../money-format";
import { useCareer } from "../use-career";
import { MarketOffers } from "./market-offers";
import { freeAgentRows, type MarketRow, offerRows, ownPlayerRows, playerRows } from "./market-rows";
import {
  type BlockedReason,
  buyBlockedReason,
  marketSummary,
  signBlockedReason,
  transferErrorKey,
} from "./market-status";
import { MarketTable } from "./market-table";
import { TransferDialog } from "./transfer-dialog";

const TABS = ["players", "free-agents", "offers"] as const;
type MarketTab = (typeof TABS)[number];

type Notice = { kind: "done" | "error"; text: string };
type DialogState = { mode: "buy" | "sign"; row: MarketRow };

function Summary({ career }: { career: Career }) {
  const { t, locale } = useI18n();
  const summary = marketSummary(career);
  const money = (value: number) => formatMoney(value, locale);
  const perSeason = (value: number) => t("squad.finance.perSeason", { amount: money(value) });
  const items = [
    ["market-balance", t("squad.finance.balance"), money(summary.balance)],
    ["market-wage-bill", t("squad.finance.wageBill"), perSeason(summary.wageBill)],
    ["market-wage-budget", t("squad.finance.wageBudget"), perSeason(summary.wageBudget)],
    [
      "market-squad-count",
      t("market.squad"),
      t("market.squadCount", { count: summary.squadCount, max: summary.squadMax }),
    ],
  ] as const;
  return (
    <Card role="group" aria-label={t("market.summary")}>
      <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
        {items.map(([id, label, value]) => (
          <div key={id}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="m-0 font-heading text-xl text-text" data-testid={id}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** The transfer market: players for sale, free agents, and offers plus the user's own squad. */
export function MarketScreen({ career }: { career: Career }) {
  const { t, locale } = useI18n();
  const store = useCareer();
  const [tab, setTab] = useState<MarketTab>("players");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const summary = marketSummary(career);
  const blockedText = (reason: BlockedReason | null): string | null =>
    reason === null
      ? null
      : t(`market.blocked.${reason}`, { count: summary.squadCount, max: summary.squadMax });
  const buyBlocked = blockedText(buyBlockedReason(career));
  const signBlocked = blockedText(signBlockedReason(career));

  const players = useMemo(() => playerRows(career), [career]);
  const freeAgents = useMemo(() => freeAgentRows(career), [career]);
  const offers = useMemo(() => offerRows(career), [career]);
  const own = useMemo(() => ownPlayerRows(career), [career]);
  const clubs = career.league.clubs.filter((c) => c.id !== career.userClubId);
  const money = (value: number) => formatMoney(value, locale);

  const report = (error: TransferError | null, done: string): void =>
    setNotice(
      error === null
        ? { kind: "done", text: done }
        : { kind: "error", text: t(transferErrorKey(error)) },
    );

  const submit = (amount: number, seasons: number): TransferError | null => {
    if (!dialog) return "unknown-player";
    const { row, mode } = dialog;
    const error =
      mode === "buy"
        ? store.buyPlayer(row.player.id, amount, seasons)
        : store.signFreeAgent(row.player.id, amount, seasons);
    if (error === null) {
      setNotice({
        kind: "done",
        text:
          mode === "buy"
            ? t("market.done.buy", { name: row.player.name, fee: money(amount) })
            : t("market.done.sign", { name: row.player.name, wage: money(amount) }),
      });
    }
    return error;
  };

  const accept = (offerId: string) => {
    const offer = offers.find((o) => o.offer.id === offerId);
    const error = store.acceptOffer(offerId);
    report(
      error,
      t("market.done.accept", {
        name: offer?.player.name ?? "",
        club: offer?.clubName ?? "",
        fee: money(offer?.offer.fee ?? 0),
      }),
    );
  };
  const release = (playerId: string) => {
    const name = own.find((row) => row.player.id === playerId)?.player.name ?? "";
    report(store.releasePlayer(playerId), t("market.done.release", { name }));
  };

  const tabLabel = (value: MarketTab) => t(`market.tab.${value}`);
  return (
    <section data-testid="market-screen" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="m-0 font-heading text-3xl text-text">{t("market.title")}</h2>
        <p className="m-0 text-muted" data-testid="market-window">
          {t(career.window === "open" ? "market.window.open" : "market.window.closed")}
        </p>
      </header>
      <Summary career={career} />
      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          data-testid={notice.kind === "error" ? "market-error" : "market-done"}
          className={`m-0 inline-flex items-center gap-2 ${notice.kind === "error" ? "text-bad" : "text-good"}`}
        >
          {notice.kind === "error" ? <TriangleAlert aria-hidden="true" className="size-4" /> : null}
          {notice.text}
        </p>
      ) : null}
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as MarketTab)}
        className="flex flex-col gap-3"
      >
        <TabsList aria-label={t("market.tabs")} data-testid="market-tabs">
          {TABS.map((value) => (
            <TabsTrigger key={value} value={value} data-testid={`market-tab-${value}`}>
              {tabLabel(value)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="players" className="flex flex-col gap-3">
          {buyBlocked ? (
            <p role="status" data-testid="market-blocked" className="m-0 text-warn">
              {buyBlocked}
            </p>
          ) : null}
          <MarketTable
            kind="players"
            rows={players}
            clubs={clubs}
            blockedText={buyBlocked}
            onAction={(row) => setDialog({ mode: "buy", row })}
          />
        </TabsContent>
        <TabsContent value="free-agents" className="flex flex-col gap-3">
          {signBlocked ? (
            <p role="status" data-testid="free-agents-blocked" className="m-0 text-warn">
              {signBlocked}
            </p>
          ) : null}
          <MarketTable
            kind="free-agents"
            rows={freeAgents}
            clubs={clubs}
            blockedText={signBlocked}
            onAction={(row) => setDialog({ mode: "sign", row })}
          />
        </TabsContent>
        <TabsContent value="offers">
          <MarketOffers
            offers={offers}
            own={own}
            blockedText={blockedText(career.window === "open" ? null : "window-closed")}
            onAccept={accept}
            onRelease={release}
          />
        </TabsContent>
      </Tabs>
      {dialog ? (
        <TransferDialog
          mode={dialog.mode}
          playerName={dialog.row.player.name}
          clubName={dialog.row.clubName}
          asked={dialog.mode === "buy" ? dialog.row.fee : dialog.row.wage}
          wage={dialog.row.wage}
          onSubmit={submit}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </section>
  );
}
