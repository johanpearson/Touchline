import { Settings } from "lucide-react";
import { useI18n } from "../i18n-provider";
import { LocaleSwitch } from "../locale-switch";
import { hrefFor } from "../routes";
import { ThemeSwitch } from "../theme/theme-switch";

const LABEL = "flex items-center gap-2 text-sm";
const SELECT = "min-h-11 rounded-md border border-line bg-surface px-2 text-text";

/** Wordmark, language and theme selects and the settings link (to the saves screen for now). */
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
        <LocaleSwitch className={LABEL} selectClassName={SELECT} />
        <ThemeSwitch className={LABEL} selectClassName={SELECT} />
        <a
          data-testid="nav-saves"
          href={hrefFor({ name: "saves" })}
          aria-label={t("start.settings")}
          className="inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-text hover:bg-raised"
        >
          <Settings aria-hidden="true" className="size-[18px]" />
        </a>
      </div>
    </header>
  );
}
