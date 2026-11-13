import type { LocaleStore } from "../shared";
import { I18nProvider, useI18n } from "./i18n-provider";
import { LocaleSwitch } from "./locale-switch";

function Shell() {
  const { t } = useI18n();
  return (
    <main>
      <h1 data-testid="app-title">{t("app.title")}</h1>
      <LocaleSwitch />
    </main>
  );
}

export function App({ localeStore }: { localeStore: LocaleStore }) {
  return (
    <I18nProvider store={localeStore}>
      <Shell />
    </I18nProvider>
  );
}
