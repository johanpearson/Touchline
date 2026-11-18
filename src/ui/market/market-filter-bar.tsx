import type { PlayerPosition } from "../../game";
import { Input, Select } from "../components";
import { useI18n } from "../i18n-provider";
import { POSITION_FILTERS } from "../squad-filter";
import { limitFromText, type MarketFilter } from "./market-filter";

export type MarketFilterBarProps = {
  filter: MarketFilter;
  onChange: (change: Partial<MarketFilter>) => void;
  clubs: readonly { id: string; name: string }[];
  /** The club filter only makes sense for players that belong to a club. */
  showClub: boolean;
  /** How many rows pass the filter, announced politely. */
  count: number;
};

const textOf = (limit: number | null): string => (limit === null ? "" : String(limit));

/** The filter controls above the market table. */
export function MarketFilterBar({
  filter,
  onChange,
  clubs,
  showClub,
  count,
}: MarketFilterBarProps) {
  const { t } = useI18n();
  const positionOptions = POSITION_FILTERS.map((value) => ({
    value,
    label: value === "all" ? t("squad.filter.all") : t(`position.${value}`),
  }));
  const clubOptions = [
    { value: "all", label: t("market.filter.allClubs") },
    ...clubs.map((club) => ({ value: club.id, label: club.name })),
  ];
  return (
    <fieldset className="m-0 flex flex-wrap items-end gap-x-4 gap-y-2 border-0 p-0">
      <legend className="sr-only">{t("market.filter.label")}</legend>
      <Select
        label={t("market.filter.position")}
        value={filter.position}
        options={positionOptions}
        onValueChange={(value) => onChange({ position: value as PlayerPosition | "all" })}
        className="w-44"
      />
      {showClub ? (
        <Select
          label={t("market.filter.club")}
          value={filter.clubId}
          options={clubOptions}
          onValueChange={(clubId) => onChange({ clubId })}
          className="w-52"
        />
      ) : null}
      <Input
        inputMode="numeric"
        label={t("market.filter.maxAge")}
        value={textOf(filter.maxAge)}
        onChange={(event) => onChange({ maxAge: limitFromText(event.target.value) })}
        data-testid="market-filter-age"
        className="w-32"
      />
      <Input
        inputMode="numeric"
        label={t("market.filter.maxValue")}
        value={textOf(filter.maxValue)}
        onChange={(event) => onChange({ maxValue: limitFromText(event.target.value) })}
        data-testid="market-filter-value"
        className="w-44"
      />
      <Input
        variant="search"
        label={t("market.search")}
        value={filter.query}
        onChange={(event) => onChange({ query: event.target.value })}
        data-testid="market-search"
        className="min-w-56"
      />
      <p role="status" className="m-0 text-sm text-muted" data-testid="market-results">
        {t("market.results", { count })}
      </p>
    </fieldset>
  );
}
