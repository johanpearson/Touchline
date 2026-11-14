import type { LocaleStore, SaveStore } from "../shared";
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
import { SaveStatus } from "./save-status";
import { SavesScreen } from "./saves-screen";
import { SeasonEndScreen } from "./season-end-screen";
import { StorageWarning } from "./storage-warning";
import { CareerProvider, useCareer } from "./use-career";
import { useRoute } from "./use-route";
import "./app.css";

type RendererProp = Pick<MatchScreenProps, "createRenderer" | "tickMs">;

function Screen({ createRenderer, tickMs, initialSeed }: RendererProp & { initialSeed: number }) {
  const route = useRoute();
  const { career } = useCareer();
  if (route.name === "not-found") return <NotFoundScreen />;
  if (route.name === "saves") return <SavesScreen />;
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

type ShellProps = RendererProp & { initialSeed: number; storageAvailable: boolean };

function Shell({ createRenderer, tickMs, initialSeed, storageAvailable }: ShellProps) {
  const { t } = useI18n();
  const route = useRoute();
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 data-testid="app-title">{t("app.title")}</h1>
        <SaveStatus />
        <LocaleSwitch />
      </header>
      {storageAvailable ? null : <StorageWarning />}
      <CareerNav route={route} />
      <Screen createRenderer={createRenderer} tickMs={tickMs} initialSeed={initialSeed} />
    </main>
  );
}

export type AppProps = {
  localeStore: LocaleStore;
  /** Where autosaves are written. The composition root passes IndexedDB, or memory as a fallback. */
  saveStore: SaveStore;
  /** Clock returning an ISO 8601 timestamp, injected so the UI never reads the time itself. */
  now: () => string;
  /** False when `saveStore` is the in-memory fallback; shows a warning that progress is lost. */
  storageAvailable?: boolean;
  /** The seed the new-career screen starts with; the composition root picks it at random. */
  initialSeed: number;
} & RendererProp;

export function App({
  localeStore,
  saveStore,
  now,
  storageAvailable = true,
  createRenderer,
  tickMs,
  initialSeed,
}: AppProps) {
  return (
    <I18nProvider store={localeStore}>
      <CareerProvider saveStore={saveStore} now={now}>
        <Shell
          createRenderer={createRenderer}
          tickMs={tickMs}
          initialSeed={initialSeed}
          storageAvailable={storageAvailable}
        />
      </CareerProvider>
    </I18nProvider>
  );
}
