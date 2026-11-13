import type { LocaleStore } from "../shared";
import { CareerHubScreen } from "./career-hub-screen";
import { CareerNav } from "./career-nav";
import { ClubView } from "./club-screen";
import { I18nProvider, useI18n } from "./i18n-provider";
import { LeagueScreen } from "./league-screen";
import { LocaleSwitch } from "./locale-switch";
import { MatchFlowScreen } from "./match-flow-screen";
import type { MatchScreenProps } from "./match-view";
import { MatchdayResultsScreen } from "./matchday-results-screen";
import { NewCareerScreen } from "./new-career-screen";
import { NotFoundScreen } from "./not-found-screen";
import { SeasonEndScreen } from "./season-end-screen";
import { CareerProvider, useCareer } from "./use-career";
import { useRoute } from "./use-route";
import "./app.css";

type RendererProp = Pick<MatchScreenProps, "createRenderer" | "tickMs">;

function Screen({ createRenderer, tickMs, initialSeed }: RendererProp & { initialSeed: number }) {
  const route = useRoute();
  const { career } = useCareer();
  if (route.name === "not-found") return <NotFoundScreen />;
  if (!career) return <NewCareerScreen initialSeed={initialSeed} />;
  switch (route.name) {
    case "home":
      return <CareerHubScreen />;
    case "league":
      return <LeagueScreen />;
    case "club":
      return <ClubView career={career} clubId={route.clubId} />;
    case "match":
      return <MatchFlowScreen createRenderer={createRenderer} tickMs={tickMs} />;
    case "results":
      return <MatchdayResultsScreen />;
    case "season-end":
      return <SeasonEndScreen />;
  }
}

function Shell({ createRenderer, tickMs, initialSeed }: RendererProp & { initialSeed: number }) {
  const { t } = useI18n();
  const route = useRoute();
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 data-testid="app-title">{t("app.title")}</h1>
        <LocaleSwitch />
      </header>
      <CareerNav route={route} />
      <Screen createRenderer={createRenderer} tickMs={tickMs} initialSeed={initialSeed} />
    </main>
  );
}

export type AppProps = {
  localeStore: LocaleStore;
  /** The seed the new-career screen starts with; the composition root picks it at random. */
  initialSeed: number;
} & RendererProp;

export function App({ localeStore, createRenderer, tickMs, initialSeed }: AppProps) {
  return (
    <I18nProvider store={localeStore}>
      <CareerProvider>
        <Shell createRenderer={createRenderer} tickMs={tickMs} initialSeed={initialSeed} />
      </CareerProvider>
    </I18nProvider>
  );
}
