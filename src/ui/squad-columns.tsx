import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE } from "../game";
import type { Translator } from "../i18n";
import { Badge, type Column } from "./components";
import { LOW_FITNESS, type PlanRow, type PlanStatus } from "./plan-rows";
import { hrefFor } from "./routes";

const POSITION_RANK = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;
const STATUS_RANK: Record<PlanStatus, number> = { starter: 0, bench: 1, out: 2 };

/** Ties in any sort fall back to line order, then id, so the order is stable. */
export const squadTieBreak = (row: PlanRow): string =>
  `${POSITION_RANK[row.player.position]}:${row.player.id}`;

export type SquadColumnContext = Pick<Translator, "t" | "formatNumber"> & {
  /** The club identity colour for the overall bar. */
  barColour: string;
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

function FitnessCell({ row, ctx }: { row: PlanRow; ctx: SquadColumnContext }) {
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
  value: (row: PlanRow) => number,
  cell: (row: PlanRow) => ReactNode,
): Column<PlanRow> => ({
  id,
  header,
  priority,
  align: "end",
  sortValue: value,
  cell,
});

/** The squad table's columns, by priority: 1 player, position, overall, fitness; 2 age, form, status; 3 attributes. */
export function squadColumns(ctx: SquadColumnContext): Column<PlanRow>[] {
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
      (row) => formatNumber(row.player.age, 0),
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
