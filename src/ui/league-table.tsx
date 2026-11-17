import { useMemo } from "react";
import type { Career } from "../game";
import { DataTable, EmptyState } from "./components";
import { useI18n } from "./i18n-provider";
import { leagueColumns } from "./league-columns";
import { leagueRows } from "./league-rows";
import { useDensity } from "./theme/density-provider";

/** The standings in `computeTable` order: a table on wide screens, cards on phones. Not sortable. */
export function LeagueTable({ career }: { career: Career }) {
  const { t, formatNumber, formatSigned, locale } = useI18n();
  const { density } = useDensity();
  const rows = useMemo(() => leagueRows(career), [career]);
  const columns = useMemo(
    () => leagueColumns({ t, formatNumber, formatSigned, userClubId: career.userClubId }),
    [t, formatNumber, formatSigned, career.userClubId],
  );
  return (
    <div data-testid="league-table">
      <DataTable
        label={t("league.table")}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.clubId}
        rowAttributes={(row) => ({ "data-testid": `table-row-${row.clubId}` })}
        labels={{
          sortBy: t("squad.sort.by"),
          ascending: t("squad.sort.ascending"),
          descending: t("squad.sort.descending"),
        }}
        density={density}
        locale={locale}
        highlight={(row) => row.clubId === career.userClubId}
        accent={(row) => row.club.colours.primary}
        empty={<EmptyState title={t("league.empty.title")} text={t("league.empty.text")} />}
      />
    </div>
  );
}
