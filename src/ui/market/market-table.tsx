import { useMemo, useState } from "react";
import { Button, DataTable, EmptyState } from "../components";
import { useI18n } from "../i18n-provider";
import { useDensity } from "../theme/density-provider";
import { marketColumns, marketTieBreak } from "./market-columns";
import { ALL_FILTERS, filterMarketRows, type MarketFilter } from "./market-filter";
import { MarketFilterBar } from "./market-filter-bar";
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
  return (
    <div className="flex flex-col gap-3">
      <MarketFilterBar
        filter={filter}
        onChange={set}
        clubs={props.clubs}
        showClub={buying}
        count={rows.length}
      />
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
