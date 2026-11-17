import { Star } from "lucide-react";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE } from "../game";
import { attributeBandOf, type ClubSquadRow } from "./club-rows";
import type { Column } from "./components";
import { hrefFor } from "./routes";
import { Gauge, type SquadColumnContext } from "./squad-columns";

const POSITION_RANK = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;

/** Ties in any sort fall back to line order, then id, so the order is stable. */
export const clubTieBreak = (row: ClubSquadRow): string =>
  `${POSITION_RANK[row.player.position]}:${row.player.id}`;

// Written out in full so Tailwind finds the classes. The number is always shown beside the colour.
const BAND_TEXT = { low: "text-bad", mid: "text-text", high: "text-good" } as const;

const numberColumn = (
  id: string,
  header: string,
  priority: 1 | 2 | 3,
  value: (row: ClubSquadRow) => number,
  cell: (row: ClubSquadRow) => React.ReactNode,
  fullHeader?: string,
): Column<ClubSquadRow> => ({
  id,
  header,
  fullHeader,
  priority,
  align: "end",
  sortValue: value,
  cell,
});

/** The club squad table's columns, by priority: 1 player, position, overall, fitness; 2 age, form; 3 attributes. */
export function clubColumns(ctx: SquadColumnContext): Column<ClubSquadRow>[] {
  const { t, formatNumber } = ctx;
  return [
    {
      id: "name",
      header: t("club.col.name"),
      priority: 1,
      primary: true,
      sortValue: (row) => row.player.name,
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5">
          {row.inBestEleven ? (
            <span
              role="img"
              aria-label={t("club.bestEleven")}
              title={t("club.bestEleven")}
              data-testid={`best-eleven-mark-${row.player.id}`}
              className="inline-flex text-warn"
            >
              <Star aria-hidden="true" className="size-4 fill-current" />
            </span>
          ) : null}
          <a
            data-testid={`player-link-${row.player.id}`}
            href={hrefFor({ name: "player", playerId: row.player.id })}
          >
            {row.player.name}
          </a>
        </span>
      ),
    },
    {
      id: "position",
      header: t("squad.col.position"),
      priority: 1,
      sortValue: (row) => POSITION_RANK[row.player.position],
      cell: (row) => t(`position.short.${row.player.position}`),
    },
    numberColumn(
      "age",
      t("club.col.age.short"),
      2,
      (row) => row.player.age,
      (row) => formatNumber(row.player.age, 0),
      t("club.col.age"),
    ),
    numberColumn(
      "overall",
      t("club.col.overall.short"),
      1,
      (row) => row.overall,
      (row) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span>{formatNumber(row.overall, 1)}</span>
          <Gauge value={(row.overall / MAX_ATTRIBUTE) * 100} colour={ctx.barColour} />
        </span>
      ),
      t("club.col.overall"),
    ),
    numberColumn(
      "fitness",
      t("club.col.fitness.short"),
      1,
      (row) => row.fitness,
      (row) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span data-testid={`fitness-${row.player.id}`}>{formatNumber(row.fitness, 0)}</span>
          <Gauge value={row.fitness} colour="var(--good)" />
        </span>
      ),
      t("club.col.fitness"),
    ),
    numberColumn(
      "form",
      t("club.col.form.short"),
      2,
      (row) => row.form,
      (row) => <span data-testid={`form-${row.player.id}`}>{formatNumber(row.form, 0)}</span>,
      t("club.col.form"),
    ),
    ...ATTRIBUTE_NAMES.map((name) =>
      numberColumn(
        name,
        t(`attr.${name}.short`),
        3,
        (row) => row.player[name],
        (row) => {
          const band = attributeBandOf(row.player[name]);
          return (
            <span
              className={BAND_TEXT[band]}
              data-band={band}
              data-testid={`attr-${row.player.id}-${name}`}
            >
              {row.player[name]}
            </span>
          );
        },
        t(`attr.${name}`),
      ),
    ),
  ];
}
