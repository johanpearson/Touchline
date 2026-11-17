import type { Outcome } from "../game";
import { cn } from "./components";
import { useI18n } from "./i18n-provider";

// Written out in full so Tailwind finds the classes. Colour is never the only cue: every chip shows its letter.
const TONE: Record<Outcome, string> = {
  W: "border-good text-good",
  D: "border-muted text-muted",
  L: "border-bad text-bad",
};

/** The last results of a club as W, D and L chips (letters, with the full word for screen readers). */
export function FormChips({ form }: { form: readonly Outcome[] }) {
  const { t } = useI18n();
  if (form.length === 0) {
    return (
      <span className="text-muted" data-testid="form-empty">
        <span aria-hidden="true">–</span>
        <span className="sr-only">{t("league.form.none")}</span>
      </span>
    );
  }
  return (
    <ul
      aria-label={t("league.col.form.full")}
      className="m-0 inline-flex list-none gap-1 p-0"
      data-testid="form-chips"
    >
      {form.map((outcome, index) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: the form list is a fixed-order sequence
          key={index}
          data-testid="form-chip"
          data-outcome={outcome}
          title={t(`club.form.${outcome}`)}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-sm border text-xs font-bold",
            TONE[outcome],
          )}
        >
          <span aria-hidden="true">{t(`league.form.${outcome}`)}</span>
          <span className="sr-only">{t(`club.form.${outcome}`)}</span>
        </li>
      ))}
    </ul>
  );
}
