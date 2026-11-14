import { useI18n } from "./i18n-provider";
import { useCareer } from "./use-career";

const formatTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
};

/** Small header indicator for the state of the latest autosave. Hidden until the first save. */
export function SaveStatus() {
  const { t, locale } = useI18n();
  const { saveStatus, lastSavedAt } = useCareer();
  if (saveStatus === "idle") return null;
  const text =
    saveStatus === "saving"
      ? t("save.saving")
      : saveStatus === "error"
        ? t("save.error")
        : t("save.saved", { time: lastSavedAt ? formatTime(lastSavedAt, locale) : "" });
  return (
    <output className={`save-status save-status-${saveStatus}`} data-testid="save-status">
      {text}
    </output>
  );
}
