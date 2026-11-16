import { cn } from "../components";
import { useI18n } from "../i18n-provider";

/** The game name, the page's `h1`. In the icon rail it is read by screen readers only. */
export function Brand({ hidden = false }: { hidden?: boolean }) {
  const { t } = useI18n();
  return (
    <h1
      data-testid="app-title"
      className={cn(
        "font-heading text-2xl font-bold uppercase tracking-wide text-text",
        hidden && "sr-only",
      )}
    >
      {t("app.title")}
    </h1>
  );
}
