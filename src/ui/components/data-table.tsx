import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { type CSSProperties, Fragment, type ReactNode, useMemo, useRef, useState } from "react";
import type { Density } from "../theme/density";
import { cn } from "./cn";
import {
  ariaSortValue,
  type Column,
  columnsForWidth,
  groupRows,
  nextSort,
  parseSortKey,
  type RowGroup,
  type SortState,
  type SortValue,
  sortKey,
  sortOptions,
  sortRows,
  splitCardColumns,
} from "./data-table-logic";
import { ScrollArea } from "./scroll-area";
import { Select } from "./select";
import { useContainerWidth } from "./use-container-width";
import { useMediaQuery } from "./use-media-query";

export type DataTableLabels = {
  /** Label of the sort select shown in card mode. */
  sortBy: string;
  ascending: string;
  descending: string;
};

export type DataTableProps<Row> = {
  /** Names the table for assistive technology (rendered as a visually hidden caption). */
  label: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  labels: DataTableLabels;
  density?: Density;
  /** Locale for text collation, usually the active UI locale. */
  locale?: string;
  defaultSort?: SortState;
  /** Always ascending; decides between rows with equal sort values. */
  tieBreak?: (row: Row) => SortValue;
  groupBy?: (row: Row) => string;
  groupLabel?: (key: string) => string;
  /** The user's club. Shown with an edge accent and a quiet background, never a club-coloured fill. */
  highlight?: (row: Row) => boolean;
  /** A CSS colour for the highlighted row's edge, usually a club identity colour. */
  accent?: (row: Row) => string | undefined;
  /** Rendered instead of the table when there are no rows, usually an EmptyState. */
  empty?: ReactNode;
  /** Called when a header (or the card sort select) changes the sort, so a caller can remember it. */
  onSortChange?: (sort: SortState) => void;
  /** Extra attributes (test ids, data attributes) for a row's `tr` or card. */
  rowAttributes?: (row: Row) => RowAttributes;
  /** Forces card mode on or off. By default cards are used below 640 px viewport width. */
  cards?: boolean;
  className?: string;
};

export type RowAttributes = { [name: `data-${string}`]: string | undefined };

const PHONE_QUERY = "(max-width: 639px)";

const alignClass = { start: "text-left", end: "text-right", center: "text-center" } as const;

/**
 * An accessible, responsive table: columns hide by priority as the table's own width shrinks, headers
 * sort (`aria-sort`), the first column and header stick when it scrolls, and on phones every row
 * becomes a card. Density changes row padding only.
 */
export function DataTable<Row>(props: DataTableProps<Row>) {
  const { columns, rows, empty, cards, className } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [sort, setSortState] = useState<SortState | null>(props.defaultSort ?? null);
  const { onSortChange } = props;
  const setSort = (next: SortState) => {
    setSortState(next);
    onSortChange?.(next);
  };

  // Groups keep their order (squad by position); rows are sorted inside each group.
  const groups = useMemo(() => {
    const column = columns.find((c) => c.id === sort?.id);
    return groupRows(rows, props.groupBy).map((group) =>
      !sort || !column
        ? group
        : {
            ...group,
            rows: sortRows(group.rows, column, {
              direction: sort.direction,
              locale: props.locale,
              tieBreak: props.tieBreak,
            }),
          },
    );
  }, [rows, columns, sort, props.groupBy, props.locale, props.tieBreak]);

  const showCards = cards ?? isPhone;
  let body: ReactNode;
  if (rows.length === 0) body = empty ?? null;
  else if (showCards) body = <CardList {...props} groups={groups} sort={sort} onSort={setSort} />;
  else
    body = (
      <TableView
        {...props}
        groups={groups}
        columns={columnsForWidth(columns, width)}
        sort={sort}
        onSort={setSort}
      />
    );

  return (
    <div ref={containerRef} className={cn("min-w-0", className)}>
      {body}
    </div>
  );
}

type ViewProps<Row> = DataTableProps<Row> & {
  groups: RowGroup<Row>[];
  sort: SortState | null;
  onSort: (sort: SortState) => void;
};

/** Data attribute and accent variable for the user's row; a plain row gets neither. */
function markingFor<Row>(
  row: Row,
  highlight?: (row: Row) => boolean,
  accent?: (row: Row) => string | undefined,
) {
  const marked = highlight?.(row) === true;
  return {
    marked,
    attributes: {
      "data-highlighted": marked ? ("true" as const) : undefined,
      style: marked ? ({ "--row-accent": accent?.(row) } as CSSProperties) : undefined,
    },
  };
}

// Written out in full so Tailwind finds the classes.
const EDGE = "shadow-[inset_4px_0_0_var(--row-accent,var(--accent))]";
const FIRST_CELL_EDGE = "[&>:first-child]:shadow-[inset_4px_0_0_var(--row-accent,var(--accent))]";
const GROUP_TEXT = "text-xs font-semibold tracking-wide text-soft uppercase";

const cellPadding = (density: Density) =>
  density === "comfortable" ? "px-3 py-3.5 min-h-11" : "px-3 py-2";

const groupText = (key: string, groupLabel?: (key: string) => string) =>
  groupLabel ? groupLabel(key) : key;

function TableView<Row>({
  label,
  columns,
  groups,
  density = "compact",
  sort,
  onSort,
  ...rest
}: ViewProps<Row>) {
  return (
    <ScrollArea label={label} className="rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-[15px] tabular-nums">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <HeadCell
                key={column.id}
                column={column}
                first={index === 0}
                sort={sort}
                density={density}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.key ?? "all"}>
              {group.key !== null ? (
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={columns.length}
                    className={cn("bg-raised px-3 py-1.5 text-left", GROUP_TEXT)}
                  >
                    {groupText(group.key, rest.groupLabel)}
                  </th>
                </tr>
              ) : null}
              {group.rows.map((row) => (
                <BodyRow
                  key={rest.rowKey(row)}
                  row={row}
                  columns={columns}
                  density={density}
                  {...rest}
                />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

type HeadCellProps<Row> = {
  column: Column<Row>;
  first: boolean;
  sort: SortState | null;
  density: Density;
  onSort: (sort: SortState) => void;
};

function HeadCell<Row>({ column, first, sort, density, onSort }: HeadCellProps<Row>) {
  return (
    <th
      scope="col"
      aria-sort={ariaSortValue(sort, column.id)}
      aria-label={column.fullHeader}
      title={column.fullHeader}
      className={cn(
        "sticky top-0 border-b border-line bg-surface px-3 py-2 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase",
        alignClass[column.align ?? "start"],
        first && "left-0 z-10",
      )}
    >
      <HeaderContent
        column={column}
        sort={sort}
        density={density}
        onSort={() => onSort(nextSort(sort, column.id))}
      />
    </th>
  );
}

type BodyRowProps<Row> = Pick<DataTableProps<Row>, "highlight" | "accent" | "rowAttributes"> & {
  row: Row;
  columns: readonly Column<Row>[];
  density: Density;
};

function BodyRow<Row>({
  row,
  columns,
  density,
  highlight,
  accent,
  rowAttributes,
}: BodyRowProps<Row>) {
  const { marked, attributes } = markingFor(row, highlight, accent);
  return (
    <tr
      {...rowAttributes?.(row)}
      {...attributes}
      className={cn(
        "border-b border-line last:border-b-0",
        marked && "bg-glow",
        marked && FIRST_CELL_EDGE,
      )}
    >
      {columns.map((column, index) => (
        <td
          key={column.id}
          className={cn(
            cellPadding(density),
            "text-text",
            alignClass[column.align ?? "start"],
            index === 0 && "sticky left-0 z-[1] bg-inherit font-medium whitespace-nowrap",
            index === 0 && !marked && "bg-surface",
          )}
        >
          {column.cell(row)}
        </td>
      ))}
    </tr>
  );
}

function HeaderContent<Row>({
  column,
  sort,
  density,
  onSort,
}: {
  column: Column<Row>;
  sort: SortState | null;
  density: Density;
  onSort: () => void;
}) {
  if (!column.sortValue) return <>{column.header}</>;
  const active = sort?.id === column.id;
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent p-0 text-muted uppercase [font:inherit] [letter-spacing:inherit] hover:text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        density === "comfortable" && "min-h-11",
        active && "text-text",
      )}
    >
      {column.header}
      <SortIcon sort={active ? sort : null} />
    </button>
  );
}

function SortIcon({ sort }: { sort: SortState | null }) {
  const Icon = !sort ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return <Icon aria-hidden="true" className="size-3.5" />;
}

function CardList<Row>({ label, labels, columns, groups, sort, onSort, ...rest }: ViewProps<Row>) {
  const options = sortOptions(columns, labels);
  const { heading, rest: details } = splitCardColumns(columns);
  return (
    <div className="flex flex-col gap-3">
      {options.length > 0 ? (
        <Select
          label={labels.sortBy}
          options={options}
          value={sortKey(sort)}
          onValueChange={(value) => {
            const next = parseSortKey(value);
            if (next) onSort(next);
          }}
        />
      ) : null}
      <ul aria-label={label} className="m-0 flex list-none flex-col gap-2 p-0 tabular-nums">
        {groups.map((group) => (
          <Fragment key={group.key ?? "all"}>
            {group.key !== null ? (
              <li className={cn("px-1 pt-2", GROUP_TEXT)}>
                {groupText(group.key, rest.groupLabel)}
              </li>
            ) : null}
            {group.rows.map((row) => (
              <li key={rest.rowKey(row)}>
                <CardItem row={row} heading={heading} details={details} {...rest} />
              </li>
            ))}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}

type CardItemProps<Row> = Pick<DataTableProps<Row>, "highlight" | "accent" | "rowAttributes"> & {
  row: Row;
  heading: readonly Column<Row>[];
  details: readonly Column<Row>[];
};

function CardItem<Row>({
  row,
  heading,
  details,
  highlight,
  accent,
  rowAttributes,
}: CardItemProps<Row>) {
  const { marked, attributes } = markingFor(row, highlight, accent);
  return (
    <article
      {...rowAttributes?.(row)}
      {...attributes}
      className={cn(
        "min-h-11 rounded-lg border border-line p-3",
        marked ? cn("bg-glow", EDGE) : "bg-surface",
      )}
    >
      <h3 className="m-0 flex flex-wrap gap-x-2 text-base font-semibold text-text">
        {heading.map((column) => (
          <span key={column.id}>{column.cell(row)}</span>
        ))}
      </h3>
      <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {details.map((column) => (
          <Fragment key={column.id}>
            <dt className="text-muted">{column.fullHeader ?? column.header}</dt>
            <dd className="m-0 text-right text-text">{column.cell(row)}</dd>
          </Fragment>
        ))}
      </dl>
    </article>
  );
}
