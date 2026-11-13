import type { LocaleStore } from "../shared";
import { CareerHubScreen } from "./career-hub-screen";
import { CareerNav } from "./career-nav";
import { ClubView } from "./club-screen";
import { demoMatch } from "./demo-match";
import { I18nProvider, useI18n } from "./i18n-provider";
import { LocaleSwitch } from "./locale-switch";
import { MatchScreen, type MatchScreenProps } from "./match-view";
import { NewCareerScreen } from "./new-career-screen";
import { NotFoundScreen } from "./not-found-screen";
import { PlaceholderScreen } from "./placeholder-screen";
import { CareerProvider, useCareer } from "./use-career";
import { useRoute } from "./use-route";
import "./app.css";

type RendererProp = Pick<MatchScreenProps, "createRenderer">;

function Screen({ createRenderer, initialSeed }: RendererProp & { initialSeed: number }) {
  const route = useRoute();
  const { career } = useCareer();
  if (route.name === "not-found") return <NotFoundScreen />;
  if (route.name === "match") return <MatchScreen {...demoMatch} createRenderer={createRenderer} />;
  if (!career) return <NewCareerScreen initialSeed={initialSeed} />;
  switch (route.name) {
    case "home":
      return <CareerHubScreen />;
    case "league":
      return <PlaceholderScreen testId="screen-league" titleKey="screen.league" />;
    case "club":
      return <ClubView career={career} clubId={route.clubId} />;
    case "season-end":
      return <PlaceholderScreen testId="screen-season-end" titleKey="screen.seasonEnd" />;
  }
}

function Shell({ createRenderer, initialSeed }: RendererProp & { initialSeed: number }) {
  const { t } = useI18n();
  const route = useRoute();
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 data-testid="app-title">{t("app.title")}</h1>
        <LocaleSwitch />
      </header>
      <CareerNav route={route} />
      <Screen createRenderer={createRenderer} initialSeed={initialSeed} />
    </main>
  );
}

export type AppProps = {
  localeStore: LocaleStore;
  /** The seed the new-career screen starts with; the composition root picks it at random. */
  initialSeed: number;
} & RendererProp;

export function App({ localeStore, createRenderer, initialSeed }: AppProps) {
  return (
    <I18nProvider store={localeStore}>
      <CareerProvider>
        <Shell createRenderer={createRenderer} initialSeed={initialSeed} />
      </CareerProvider>
    </I18nProvider>
  );
}
