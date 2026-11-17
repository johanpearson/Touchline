import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton, Select } from "./components";
import { useI18n } from "./i18n-provider";

type Props = { round: number; total: number; onChange: (round: number) => void };

/** Previous and next buttons around a select of all rounds; everything works with the keyboard. */
export function RoundPicker({ round, total, onChange }: Props) {
  const { t, formatNumber } = useI18n();
  const options = Array.from({ length: total }, (_, i) => ({
    value: String(i + 1),
    label: t("fixtures.matchday", { matchday: formatNumber(i + 1, 0) }),
  }));
  return (
    <div className="flex items-end gap-2" data-testid="round-picker">
      <IconButton
        variant="secondary"
        label={t("fixtures.previous")}
        data-testid="matchday-previous"
        icon={<ChevronLeft />}
        disabled={round <= 1}
        onClick={() => onChange(round - 1)}
      />
      <Select
        label={t("fixtures.select")}
        options={options}
        value={String(round)}
        onValueChange={(value) => onChange(Number(value))}
        className="min-w-44"
      />
      <IconButton
        variant="secondary"
        label={t("fixtures.next")}
        data-testid="matchday-next"
        icon={<ChevronRight />}
        disabled={round >= total}
        onClick={() => onChange(round + 1)}
      />
    </div>
  );
}
