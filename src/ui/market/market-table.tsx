import { useMemo, useState } from "react";
import type { PlayerPosition } from "../../game";
import { Button, DataTable, EmptyState, Input, Select } from "../components";
import { useI18n } from "../i18n-provider";
import { POSITION_FILTERS } from "../squad-filter";
import { useDensity } from "../theme/density-provider";
import { marketColumns, marketTieBreak } from "./market-columns";
import { ALL_FILTERS, filterMarketRows, limitFromText, type MarketFilter } from "./market-filter";
import type { MarketRow } from "./market-rows";

export type MarketTableProps = {
  /** `players` buys from clubs, `free-agents` signs without a fee. */
  kind: "players" | "free-agents";
  rows: readonly MarketRow[];
  clubs: readonly { id: string; name: string }[];
  /** Why the action buttons are disabled, already translated, or null when they work. */
  blockedText: string | null;
  onAction: (row: MarketRow) => void;
};

const OVERALL_SORT = { id: "overall", direction: "desc" } as const;

/** The filterable, sortable table of players for sale or free agents. Components only render. */
export function MarketTable(props: MarketTableProps) {
  const { t, formatNumber, locale } = useI18n();
  const { density } = useDensity();
  const [filter, setFilter] = useState<MarketFilter>(ALL_FILTERS);
  const buying = props.kind === "players";
  const blocked = props.blockedText !== null;
  const set = (change: Partial<MarketFilter>) =>
    setFilter((current) => ({ ...current, ...change }));

  const columns = useMemo(
    () =>
      marketColumns({
        t,
        formatNumber,
        locale,
        showClub: buying,
        action: (row) => (
          <Button
            variant="secondary"
            disabled={blocked}
            data-testid={buying ? `buy-${row.player.id}` : `free-agent-sign-${row.player.id}`}
            aria-label={t(buying ? "market.buy.aria" : "market.sign.aria", {
              name: row.player.name,
            })}
            onClick={() => props.onAction(row)}
          >
            {t(buying ? "market.buy" : "market.sign")}
          </Button>
        ),
      }),
    [t, formatNumber, locale, buying, blocked, props.onAction],
  );
  const rows = filterMarketRows(props.rows, filter);
  const positionOptions = POSITION_FILTERS.map((value) => ({
    value,
    label: value === "all" ? t("squad.filter.all") : t(`position.${value}`),
  }));
  const clubOptions = [
    { value: "all", label: t("market.filter.allClubs") },
    ...props.clubs.map((club) => ({ value: club.id, label: club.name })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="m-0 flex flex-wrap items-end gap-x-4 gap-y-2 border-0 p-0">
        <legend className="sr-only">{t("market.filter.label")}</legend>
        <Select
          label={t("market.filter.position")}
          value={filter.position}
          options={positionOptions}
          onValueChange={(value) => set({ position: value as PlayerPosition | "all" })}
          className="w-44"
        />
        {buying ? (
          <Select
            label={t("market.filter.club")}
            value={filter.clubId}
            options={clubOptions}
            onValueChange={(clubId) => set({ clubId })}
            className="w-52"
          />
        ) : null}
        <Input
          inputMode="numeric"
          label={t("market.filter.maxAge")}
          value={filter.maxAge === null ? "" : String(filter.maxAge)}
          onChange={(event) => set({ maxAge: limitFromText(event.target.value) })}
          data-testid="market-filter-age"
          className="w-32"
        />
        <Input
          inputMode="numeric"
          label={t("market.filter.maxValue")}
          value={filter.maxValue === null ? "" : String(filter.maxValue)}
          onChange={(event) => set({ maxValue: limitFromText(event.target.value) })}
          data-testid="market-filter-value"
          className="w-44"
        />
        <Input
          variant="search"
          label={t("market.search")}
          value={filter.query}
          onChange={(event) => set({ query: event.target.value })}
          data-testid="market-search"
          className="min-w-56"
        />
        <p role="status" className="m-0 text-sm text-muted" data-testid="market-results">
          {t("market.results", { count: rows.length })}
        </p>
      </fieldset>
      <DataTable
        label={t(buying ? "market.table.players" : "market.table.freeAgents")}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.player.id}
        rowAttributes={(row) => ({ "data-testid": `market-row-${row.player.id}` })}
        labels={{
          sortBy: t("squad.sort.by"),
          ascending: t("squad.sort.ascending"),
          descending: t("squad.sort.descending"),
        }}
        density={density}
        locale={locale}
        defaultSort={OVERALL_SORT}
        tieBreak={marketTieBreak}
        empty={
          <EmptyState
            data-testid="market-empty"
            title={t(buying ? "market.players.empty.title" : "market.freeAgents.empty.title")}
            text={t(buying ? "market.players.empty.hint" : "market.freeAgents.empty.hint")}
          />
        }
      />
    </div>
  );
}
