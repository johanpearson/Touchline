import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE } from "../game";
import type { Locale, Translator } from "../i18n";
import { Badge, Button, type Column } from "./components";
import { formatMoney } from "./money-format";
import { LOW_FITNESS, type PlanStatus } from "./plan-rows";
import { hrefFor } from "./routes";
import type { SquadRow } from "./squad-rows";

const POSITION_RANK = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;
const STATUS_RANK: Record<PlanStatus, number> = { starter: 0, bench: 1, out: 2 };

/** Ties in any sort fall back to line order, then id, so the order is stable. */
export const squadTieBreak = (row: SquadRow): string =>
  `${POSITION_RANK[row.player.position]}:${row.player.id}`;

export type SquadColumnContext = Pick<Translator, "t" | "formatNumber"> & {
  /** The club identity colour for the overall bar. */
  barColour: string;
};

/** The squad screen's context: the shared one plus the locale and the detail panel opener. */
export type SquadTableContext = SquadColumnContext & {
  locale: Locale;
  /** Opens the detail panel of a player. */
  openDetails: (row: SquadRow) => void;
};

const TRACK = "h-1.5 w-16 overflow-hidden rounded-pill bg-track";
const GAUGE_EDGE = "shadow-[inset_0_0_0_1px_var(--line)]";

/** A thin bar next to a number; decorative, the number carries the value. */
export function Gauge({ value, colour }: { value: number; colour: string }) {
  return (
    <span aria-hidden="true" className={`${TRACK} ${GAUGE_EDGE} hidden sm:inline-block`}>
      <span
        className="block h-full rounded-pill"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: colour }}
      />
    </span>
  );
}

function FitnessCell({ row, ctx }: { row: SquadRow; ctx: SquadTableContext }) {
  const low = row.fitness < LOW_FITNESS;
  const colour = low ? "var(--warn)" : "var(--good)";
  return (
    <span
      className="inline-flex items-center justify-end gap-2"
      data-testid={`plan-fitness-${row.player.id}`}
    >
      {low ? (
        <span
          role="img"
          aria-label={ctx.t("squad.lowFitness")}
          title={ctx.t("squad.lowFitness")}
          data-testid={`plan-low-fitness-${row.player.id}`}
          className="inline-flex items-center gap-1 text-warn"
        >
          <TriangleAlert aria-hidden="true" className="size-4" />
        </span>
      ) : null}
      <span>{ctx.formatNumber(row.fitness, 0)}</span>
      <Gauge value={row.fitness} colour={colour} />
    </span>
  );
}

const numberColumn = (
  id: string,
  header: string,
  priority: 1 | 2 | 3,
  value: (row: SquadRow) => number,
  cell: (row: SquadRow) => ReactNode,
): Column<SquadRow> => ({
  id,
  header,
  priority,
  align: "end",
  sortValue: value,
  cell,
});

/** Filled and empty stars; the text label carries the value for assistive technology. */
function Stars({ row, ctx }: { row: SquadRow; ctx: SquadTableContext }) {
  const label = ctx.t("squad.stars", { count: row.potentialStars });
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid={`player-potential-${row.player.id}`}
      data-stars={row.potentialStars}
      className="tracking-tight text-accent"
    >
      {"★".repeat(row.potentialStars)}
      <span className="text-muted">{"☆".repeat(5 - row.potentialStars)}</span>
    </span>
  );
}

/** The squad table's columns, by priority: 1 player, position, overall, fitness; 2 age, potential, contract, wage, value, minutes, form, status; 3 attributes. */
export function squadColumns(ctx: SquadTableContext): Column<SquadRow>[] {
  const { t, formatNumber } = ctx;
  return [
    {
      id: "name",
      header: t("squad.col.name"),
      priority: 1,
      primary: true,
      sortValue: (row) => row.player.name,
      cell: (row) => (
        <a
          data-testid={`player-link-${row.player.id}`}
          href={hrefFor({ name: "player", playerId: row.player.id })}
        >
          {row.player.name}
        </a>
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
      t("squad.col.age"),
      2,
      (row) => row.player.age,
      (row) => (
        <span data-testid={`player-age-${row.player.id}`}>{formatNumber(row.player.age, 0)}</span>
      ),
    ),
    numberColumn(
      "potential",
      t("squad.col.potential"),
      2,
      (row) => row.potentialStars,
      (row) => <Stars row={row} ctx={ctx} />,
    ),
    numberColumn(
      "overall",
      t("squad.col.overall"),
      1,
      (row) => row.overall,
      (row) => (
        <span className="inline-flex items-center justify-end gap-2">
          <span>{formatNumber(row.overall, 1)}</span>
          <Gauge value={(row.overall / MAX_ATTRIBUTE) * 100} colour={ctx.barColour} />
        </span>
      ),
    ),
    numberColumn(
      "fitness",
      t("squad.col.fitness"),
      1,
      (row) => row.fitness,
      (row) => <FitnessCell row={row} ctx={ctx} />,
    ),
    numberColumn(
      "contract",
      t("squad.col.contract"),
      2,
      (row) => row.contractEnd,
      (row) => (
        <span data-testid={`player-contract-${row.player.id}`}>
          {t("squad.contractEnd", { season: row.contractEnd })}
        </span>
      ),
    ),
    numberColumn(
      "wage",
      t("squad.col.wage"),
      2,
      (row) => row.wage,
      (row) => (
        <span data-testid={`player-wage-${row.player.id}`}>
          {formatMoney(row.wage, ctx.locale)}
        </span>
      ),
    ),
    numberColumn(
      "value",
      t("squad.col.value"),
      2,
      (row) => row.value,
      (row) => (
        <span data-testid={`player-value-${row.player.id}`}>
          {formatMoney(row.value, ctx.locale)}
        </span>
      ),
    ),
    numberColumn(
      "minutes",
      t("squad.col.minutes"),
      3,
      (row) => row.minutes,
      (row) => (
        <span data-testid={`player-minutes-${row.player.id}`}>{formatNumber(row.minutes, 0)}</span>
      ),
    ),
    numberColumn(
      "form",
      t("squad.col.form"),
      2,
      (row) => row.form,
      (row) => <span data-testid={`plan-form-${row.player.id}`}>{formatNumber(row.form, 0)}</span>,
    ),
    {
      id: "status",
      header: t("squad.col.status"),
      priority: 2,
      sortValue: (row) => STATUS_RANK[row.status],
      cell: (row) => (
        <Badge
          tone={row.status === "starter" ? "good" : "neutral"}
          data-testid={`plan-status-${row.player.id}`}
          data-status={row.status}
        >
          {t(`squad.status.${row.status}`)}
        </Badge>
      ),
    },
    {
      id: "details",
      header: t("squad.col.details"),
      priority: 1,
      cell: (row) => (
        <Button
          variant="secondary"
          data-testid={`player-details-${row.player.id}`}
          aria-label={t("squad.details.open", { name: row.player.name })}
          onClick={() => ctx.openDetails(row)}
        >
          {t("squad.col.details")}
        </Button>
      ),
    },
    ...ATTRIBUTE_NAMES.map((name) =>
      numberColumn(
        name,
        t(`attr.${name}.short`),
        3,
        (row) => row.player[name],
        (row) => formatNumber(row.player[name], 0),
      ),
    ),
  ];
}
