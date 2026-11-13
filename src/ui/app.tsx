import type { LocaleStore } from "../shared";
import { demoMatch } from "./demo-match";
import { I18nProvider, useI18n } from "./i18n-provider";
import { LocaleSwitch } from "./locale-switch";
import { MatchScreen, type MatchScreenProps } from "./match-view";

function Shell({ createRenderer }: Pick<MatchScreenProps, "createRenderer">) {
  const { t } = useI18n();
  return (
    <main>
      <h1 data-testid="app-title">{t("app.title")}</h1>
      <LocaleSwitch />
      <MatchScreen {...demoMatch} createRenderer={createRenderer} />
    </main>
  );
}

export function App({
  localeStore,
  createRenderer,
}: { localeStore: LocaleStore } & Pick<MatchScreenProps, "createRenderer">) {
  return (
    <I18nProvider store={localeStore}>
      <Shell createRenderer={createRenderer} />
    </I18nProvider>
  );
}
