import { useMemo, useState } from "react";
import type { Career } from "../game";
import type { SortState } from "./components";
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components";
import { useI18n } from "./i18n-provider";
import { DEFAULT_PLAN_SORT, planRows } from "./plan-rows";
import { hrefFor } from "./routes";
import { type SquadColumnContext, squadColumns, squadTieBreak } from "./squad-columns";
import { averageAge, filterRows, POSITION_FILTERS, type PositionFilter } from "./squad-filter";
import { loadSquadSort, saveSquadSort } from "./squad-sort-session";
import { useDensity } from "./theme/density-provider";

const FIRST_SORT: SortState = {
  id: DEFAULT_PLAN_SORT.column,
  direction: DEFAULT_PLAN_SORT.direction,
};

const GROUP_ORDER = ["GK", "DEF", "MID", "FWD"] as const;

/** The squad as a player table; the lineup and tactics are edited on the tactics screen. */
export function SquadScreen({ career }: { career: Career }) {
  const { t, formatNumber, locale } = useI18n();
  const { density } = useDensity();
  const [position, setPosition] = useState<PositionFilter>("all");
  const [query, setQuery] = useState("");
  const [grouped, setGrouped] = useState(false);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const ids = new Set(club?.playerIds);
  const players = career.league.players.filter((p) => ids.has(p.id));

  const columns = useMemo(() => {
    const context: SquadColumnContext = {
      t,
      formatNumber,
      barColour: club?.colours.primary ?? "var(--accent)",
    };
    return squadColumns(context);
  }, [t, formatNumber, club?.colours.primary]);
  const initialSort = useMemo(
    () => loadSquadSort(new Set(columns.map((c) => c.id))) ?? FIRST_SORT,
    [columns],
  );

  const all = planRows(players, career.squadPlan, career.condition, DEFAULT_PLAN_SORT);
  const rows = filterRows(all, position, query);
  const positionLabel = (value: PositionFilter) =>
    value === "all" ? t("squad.filter.all") : t(`position.short.${value}`);

  const table = (
    <DataTable
      label={t("squad.table")}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.player.id}
      rowAttributes={(row) => ({
        "data-testid": `plan-row-${row.player.id}`,
        "data-position": row.player.position,
      })}
      labels={{
        sortBy: t("squad.sort.by"),
        ascending: t("squad.sort.ascending"),
        descending: t("squad.sort.descending"),
      }}
      density={density}
      locale={locale}
      defaultSort={initialSort}
      onSortChange={saveSquadSort}
      tieBreak={squadTieBreak}
      groupBy={grouped ? (row) => row.player.position : undefined}
      groupLabel={(key) => t(`position.${key as (typeof GROUP_ORDER)[number]}`)}
      empty={
        <EmptyState
          data-testid="squad-empty"
          title={t("squad.empty.title")}
          text={t("squad.empty.hint")}
        />
      }
    />
  );

  return (
    <section data-testid="squad-screen" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="m-0 font-heading text-3xl text-text">{t("squad.title")}</h2>
        <p className="m-0 text-muted" data-testid="squad-summary">
          {t("squad.summary", {
            club: club?.name ?? "",
            players: t("squad.players", { count: players.length }),
            age: formatNumber(averageAge(players), 1),
          })}
        </p>
      </header>
      <Tabs
        value={position}
        onValueChange={(value) => setPosition(value as PositionFilter)}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <TabsList aria-label={t("squad.filter.label")} data-testid="squad-filter">
            {POSITION_FILTERS.map((value) => (
              <TabsTrigger key={value} value={value} data-testid={`squad-filter-${value}`}>
                {positionLabel(value)}
              </TabsTrigger>
            ))}
          </TabsList>
          <Input
            variant="search"
            label={t("squad.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            data-testid="squad-search"
            className="min-w-56"
          />
          <label className="inline-flex min-h-11 items-center gap-2 text-soft">
            <input
              type="checkbox"
              checked={grouped}
              onChange={(event) => setGrouped(event.target.checked)}
              data-testid="squad-group"
              className="size-5 accent-[var(--accent)]"
            />
            {t("squad.groupBy")}
          </label>
          <p role="status" className="m-0 text-sm text-muted" data-testid="squad-results">
            {t("squad.results", { count: rows.length })}
          </p>
        </div>
        {POSITION_FILTERS.map((value) => (
          <TabsContent
            key={value}
            value={value}
            forceMount
            className="data-[state=inactive]:hidden"
          >
            {value === position ? <div data-testid="squad-table">{table}</div> : null}
          </TabsContent>
        ))}
      </Tabs>
      <div>
        <Button asChild variant="secondary">
          <a href={hrefFor({ name: "tactics" })} data-testid="edit-lineup">
            {t("squad.editLineup")}
          </a>
        </Button>
      </div>
    </section>
  );
}
