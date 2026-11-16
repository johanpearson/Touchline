import { createMemoryThemeStore } from "../platform";
import type { FileTransfer, LocaleStore, SaveStore, ThemeStore } from "../shared";
import { CareerHubScreen } from "./career-hub-screen";
import { ClubView } from "./club-screen";
import { I18nProvider } from "./i18n-provider";
import { LeagueScreen } from "./league-screen";
import { MatchFlowScreen } from "./match-flow-screen";
import type { MatchScreenProps } from "./match-view";
import { MatchdayResultsScreen } from "./matchday-results-screen";
import { NewCareerScreen } from "./new-career-screen";
import { NotFoundScreen } from "./not-found-screen";
import { Redirect } from "./redirect";
import type { Route } from "./routes";
import { SavesScreen } from "./saves-screen";
import { SeasonEndScreen } from "./season-end-screen";
import { AppShell } from "./shell/app-shell";
import { BareShell } from "./shell/bare-shell";
import { SquadScreen } from "./squad-screen";
import { StartScreen } from "./start/start-screen";
import { ThemeProvider } from "./theme/theme-provider";
import { CareerProvider, useCareer } from "./use-career";
import { useRoute } from "./use-route";
import "./theme/theme.css";
import "./app.css";

type RendererProp = Pick<MatchScreenProps, "createRenderer" | "tickMs">;

/** Routes that show the plain header instead of the start screen while there is no career. */
const BARE_ROUTES: readonly Route["name"][] = ["new", "saves", "not-found"];

type ScreenProps = RendererProp & { initialSeed: number };

function Screen({ createRenderer, tickMs, initialSeed }: ScreenProps) {
  const route = useRoute();
  const { career } = useCareer();
  if (route.name === "not-found") return <NotFoundScreen />;
  if (route.name === "saves") return <SavesScreen />;
  if (!career) return <NewCareerScreen initialSeed={initialSeed} />;
  switch (route.name) {
    case "new":
      return <Redirect to={{ name: "home" }} />;
    case "home":
      return <CareerHubScreen />;
    case "league":
      return <LeagueScreen />;
    case "club":
      return <ClubView career={career} clubId={route.clubId} />;
    case "match":
      return <MatchFlowScreen createRenderer={createRenderer} tickMs={tickMs} />;
    case "squad":
      return <SquadScreen career={career} />;
    case "results":
      return <MatchdayResultsScreen />;
    case "season-end":
      return <SeasonEndScreen />;
  }
}

type ShellProps = ScreenProps & { storageAvailable: boolean; now: () => string };

function Shell({ createRenderer, tickMs, initialSeed, storageAvailable, now }: ShellProps) {
  const { career } = useCareer();
  const route = useRoute();
  if (!career && !BARE_ROUTES.includes(route.name)) {
    return <StartScreen now={now} storageAvailable={storageAvailable} />;
  }
  const screen = (
    <Screen createRenderer={createRenderer} tickMs={tickMs} initialSeed={initialSeed} />
  );
  return career ? (
    <AppShell storageAvailable={storageAvailable}>{screen}</AppShell>
  ) : (
    <BareShell storageAvailable={storageAvailable}>{screen}</BareShell>
  );
}

export type AppProps = {
  localeStore: LocaleStore;
  /** Remembers the chosen theme. Defaults to an in-memory store (no persistence). */
  themeStore?: ThemeStore;
  /** Where autosaves are written. The composition root passes IndexedDB, or memory as a fallback. */
  saveStore: SaveStore;
  /** Downloads and file picking for save export and import. */
  fileTransfer: FileTransfer;
  /** Clock returning an ISO 8601 timestamp, injected so the UI never reads the time itself. */
  now: () => string;
  /** False when `saveStore` is the in-memory fallback; shows a warning that progress is lost. */
  storageAvailable?: boolean;
  /** The seed the new-career screen starts with; the composition root picks it at random. */
  initialSeed: number;
} & RendererProp;

const fallbackThemeStore = createMemoryThemeStore();

export function App({
  localeStore,
  themeStore,
  saveStore,
  fileTransfer,
  now,
  storageAvailable = true,
  createRenderer,
  tickMs,
  initialSeed,
}: AppProps) {
  return (
    <I18nProvider store={localeStore}>
      <ThemeProvider store={themeStore ?? fallbackThemeStore}>
        <CareerProvider saveStore={saveStore} now={now} fileTransfer={fileTransfer}>
          <Shell
            createRenderer={createRenderer}
            tickMs={tickMs}
            initialSeed={initialSeed}
            storageAvailable={storageAvailable}
            now={now}
          />
        </CareerProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
