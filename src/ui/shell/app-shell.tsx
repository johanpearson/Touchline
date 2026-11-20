import { type ReactNode, useRef } from "react";
import { cn } from "../components";
import { useI18n } from "../i18n-provider";
import { MatchLockProvider } from "../match-lock/match-lock";
import { MatchPanels } from "../match-lock/match-panels";
import { CommandPalette } from "../palette/command-palette";
import { PaletteProvider } from "../palette/palette-provider";
import { StorageWarning } from "../storage-warning";
import { useCareer } from "../use-career";
import { AppHeader } from "./app-header";
import { RouteTransition } from "./route-transition";
import { SideNav } from "./side-nav";
import { TabBar } from "./tab-bar";
import { usePageAnnouncement } from "./use-page-announcement";
import { useWidthMode } from "./width-mode";

export type AppShellProps = { children: ReactNode; storageAvailable: boolean };

/** The career layout: sidebar, icon rail or bottom tab bar, a header and the page content. */
export function AppShell({ children, storageAvailable }: AppShellProps) {
  const { t } = useI18n();
  const { career } = useCareer();
  const mode = useWidthMode();
  const main = useRef<HTMLElement>(null);
  const title = usePageAnnouncement(main, t("app.title"));
  const club = career?.league.clubs.find((c) => c.id === career.userClubId);
  const focusMain = () => main.current?.focus();
  return (
    <PaletteProvider>
      <MatchLockProvider>
        <div
          data-testid="app-shell"
          data-mode={mode}
          style={club ? ({ "--club": club.colours.primary } as React.CSSProperties) : undefined}
          className="flex min-h-dvh bg-bg text-text"
        >
          <button
            type="button"
            onClick={focusMain}
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-on-accent"
          >
            {t("shell.skipToContent")}
          </button>
          {mode === "tabs" ? <TabBar /> : <SideNav mode={mode} />}
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader showBrand={mode === "tabs"} />
            <main
              id="main"
              ref={main}
              tabIndex={-1}
              className={cn(
                "mx-auto box-border w-full max-w-[1280px] flex-1 p-4 outline-none sm:p-6",
                mode === "tabs" && "pb-[calc(5rem+env(safe-area-inset-bottom))]",
              )}
            >
              {storageAvailable ? null : <StorageWarning />}
              <RouteTransition>{children}</RouteTransition>
            </main>
            <output className="sr-only" aria-live="polite" data-testid="page-announcement">
              {title}
            </output>
          </div>
          <CommandPalette />
          <MatchPanels />
        </div>
      </MatchLockProvider>
    </PaletteProvider>
  );
}
