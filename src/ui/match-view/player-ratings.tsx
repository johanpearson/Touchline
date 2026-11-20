import { Star } from "lucide-react";
import { useMemo } from "react";
import type { PerSide } from "../../engine";
import { Badge } from "../components/badge";
import { DataTable } from "../components/data-table";
import type { Column } from "../components/data-table-logic";
import { useI18n } from "../i18n-provider";
import type { RatingRow } from "./ratings-table";

export type PlayerRatingsProps = {
  rows: readonly RatingRow[];
  teamNames: PerSide<string>;
};

const NO_LABELS = { sortBy: "", ascending: "", descending: "" };

/**
 * The full-time table of player ratings: the user's side first, each side by rating. The best
 * player carries a star and a text label (never colour alone). On phones every row is a card.
 */
export function PlayerRatings({ rows, teamNames }: PlayerRatingsProps) {
  const { t, formatNumber, locale } = useI18n();
  const columns = useMemo<Column<RatingRow>[]>(() => {
    const stat = (id: "goals" | "keyPasses" | "shots", priority: 1 | 2): Column<RatingRow> => ({
      id,
      header: t(`ratings.${id}`),
      priority,
      align: "end",
      cell: (row) => formatNumber(row[id], 0),
    });
    return [
      {
        id: "player",
        header: t("ratings.player"),
        priority: 1,
        primary: true,
        cell: (row) => (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{row.name}</span>
            {row.playerOfTheMatch ? (
              <Badge tone="warn" data-testid="player-of-the-match">
                <Star aria-hidden="true" className="size-3.5" />
                {t("ratings.playerOfTheMatch")}
              </Badge>
            ) : null}
          </span>
        ),
      },
      { id: "team", header: t("ratings.team"), priority: 2, cell: (row) => teamNames[row.side] },
      {
        id: "rating",
        header: t("ratings.rating"),
        priority: 1,
        align: "end",
        cell: (row) => <strong>{formatNumber(row.rating, 1)}</strong>,
      },
      stat("goals", 1),
      stat("keyPasses", 2),
      stat("shots", 2),
      {
        id: "energy",
        header: t("ratings.energy"),
        priority: 2,
        align: "end",
        cell: (row) => formatNumber(row.energy, 0),
      },
      {
        id: "xg",
        header: t("ratings.xg"),
        priority: 3,
        align: "end",
        cell: (row) => formatNumber(row.xg, 2),
      },
    ];
  }, [t, formatNumber, teamNames]);
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="ratings-title"
      data-testid="player-ratings"
    >
      <h2 id="ratings-title" className="m-0 font-heading text-xl font-semibold">
        {t("ratings.title")}
      </h2>
      <DataTable
        label={t("ratings.title")}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        rowAttributes={(row) => ({
          "data-testid": `rating-row-${row.id}`,
          "data-side": row.side,
          "data-potm": row.playerOfTheMatch ? "true" : undefined,
        })}
        labels={NO_LABELS}
        locale={locale}
      />
    </section>
  );
}
