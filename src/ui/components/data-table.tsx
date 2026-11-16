import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { type CSSProperties, Fragment, type ReactNode, useMemo, useRef, useState } from "react";
import type { Density } from "../theme/density";
import { cn } from "./cn";
import {
  type Column,
  columnsForWidth,
  groupRows,
  nextSort,
  type RowGroup,
  type SortState,
  type SortValue,
  sortRows,
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
  /** Forces card mode on or off. By default cards are used below 640 px viewport width. */
  cards?: boolean;
  className?: string;
};

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
  const [sort, setSort] = useState<SortState | null>(props.defaultSort ?? null);

  // Groups keep their order (squad by position); rows are sorted inside each group.
  const groups = useMemo(() => {
    const column = columns.find((c) => c.id === sort?.id);
    return groupRows(rows, props.groupBy).map((group) =>
      !sort || !column
        ? group
        : {
            ...group,
            rows: sortRows(group.rows, column, sort.direction, props.locale, props.tieBreak),
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

const cellPadding = (density: Density) =>
  density === "comfortable" ? "px-3 py-3.5 min-h-11" : "px-3 py-2";

function ariaSort(sort: SortState | null, id: string) {
  if (sort?.id !== id) return undefined;
  return sort.direction === "asc" ? "ascending" : "descending";
}

function TableView<Row>({
  label,
  columns,
  groups,
  rowKey,
  density = "compact",
  groupLabel,
  highlight,
  accent,
  sort,
  onSort,
}: ViewProps<Row>) {
  return (
    <ScrollArea label={label} className="rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-[15px] tabular-nums">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.id}
                scope="col"
                aria-sort={ariaSort(sort, column.id)}
                className={cn(
                  "sticky top-0 border-b border-line bg-surface px-3 py-2 text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase",
                  alignClass[column.align ?? "start"],
                  index === 0 && "left-0 z-10",
                )}
              >
                <HeaderContent
                  column={column}
                  sort={sort}
                  density={density}
                  onSort={() => onSort(nextSort(sort, column.id))}
                />
              </th>
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
                    className="bg-raised px-3 py-1.5 text-left text-xs font-semibold tracking-wide text-soft uppercase"
                  >
                    {groupLabel ? groupLabel(group.key) : group.key}
                  </th>
                </tr>
              ) : null}
              {group.rows.map((row) => {
                const marked = highlight?.(row) === true;
                return (
                  <tr
                    key={rowKey(row)}
                    data-highlighted={marked ? "true" : undefined}
                    style={
                      marked ? ({ "--row-accent": accent?.(row) } as CSSProperties) : undefined
                    }
                    className={cn(
                      "border-b border-line last:border-b-0",
                      marked &&
                        "bg-glow [&>:first-child]:shadow-[inset_4px_0_0_var(--row-accent,var(--accent))]",
                    )}
                  >
                    {columns.map((column, index) => (
                      <td
                        key={column.id}
                        className={cn(
                          cellPadding(density),
                          "text-text",
                          alignClass[column.align ?? "start"],
                          index === 0 &&
                            "sticky left-0 z-[1] bg-inherit font-medium whitespace-nowrap",
                          index === 0 && !marked && "bg-surface",
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </ScrollArea>
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
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase hover:text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        density === "comfortable" && "min-h-11",
        active && "text-text",
      )}
    >
      {column.header}
      <Icon aria-hidden="true" className="size-3.5" />
    </button>
  );
}

function CardList<Row>({
  label,
  labels,
  columns,
  groups,
  rowKey,
  groupLabel,
  highlight,
  accent,
  sort,
  onSort,
}: ViewProps<Row>) {
  const sortable = columns.filter((c) => c.sortValue);
  const options = sortable.flatMap((c) => [
    { value: `${c.id}:asc`, label: `${c.header} (${labels.ascending})` },
    { value: `${c.id}:desc`, label: `${c.header} (${labels.descending})` },
  ]);
  const primary = columns.filter((c) => c.primary);
  const heading = primary.length > 0 ? primary : columns.slice(0, 1);
  const rest = columns.filter((c) => !heading.includes(c));

  return (
    <div className="flex flex-col gap-3">
      {options.length > 0 ? (
        <Select
          label={labels.sortBy}
          options={options}
          value={sort ? `${sort.id}:${sort.direction}` : undefined}
          onValueChange={(value) => {
            const [id, direction] = value.split(":");
            if (id && (direction === "asc" || direction === "desc")) onSort({ id, direction });
          }}
        />
      ) : null}
      <ul aria-label={label} className="m-0 flex list-none flex-col gap-2 p-0 tabular-nums">
        {groups.map((group) => (
          <Fragment key={group.key ?? "all"}>
            {group.key !== null ? (
              <li className="px-1 pt-2 text-xs font-semibold tracking-wide text-soft uppercase">
                {groupLabel ? groupLabel(group.key) : group.key}
              </li>
            ) : null}
            {group.rows.map((row) => {
              const marked = highlight?.(row) === true;
              return (
                <li key={rowKey(row)}>
                  <article
                    data-highlighted={marked ? "true" : undefined}
                    style={
                      marked ? ({ "--row-accent": accent?.(row) } as CSSProperties) : undefined
                    }
                    className={cn(
                      "min-h-11 rounded-lg border border-line p-3",
                      marked
                        ? "bg-glow shadow-[inset_4px_0_0_var(--row-accent,var(--accent))]"
                        : "bg-surface",
                    )}
                  >
                    <h3 className="m-0 flex flex-wrap gap-x-2 text-base font-semibold text-text">
                      {heading.map((column) => (
                        <span key={column.id}>{column.cell(row)}</span>
                      ))}
                    </h3>
                    <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      {rest.map((column) => (
                        <Fragment key={column.id}>
                          <dt className="text-muted">{column.header}</dt>
                          <dd className="m-0 text-right text-text">{column.cell(row)}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  </article>
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
