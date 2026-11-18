import { Settings } from "lucide-react";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";

/** Wordmark and the settings link. */
export function StartHeader() {
  const { t } = useI18n();
  return (
    <header className="relative flex flex-wrap items-center gap-3 px-4 py-4 sm:px-10 sm:py-6">
      <span
        data-testid="app-title"
        className="font-heading text-[26px] font-extrabold tracking-[0.12em] text-text uppercase"
      >
        {t("app.title")}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-3 text-muted">
        <a
          data-testid="nav-settings"
          href={hrefFor({ name: "settings" })}
          aria-label={t("start.settings")}
          className="inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-text hover:bg-raised"
        >
          <Settings aria-hidden="true" className="size-[18px]" />
        </a>
      </div>
    </header>
  );
}
