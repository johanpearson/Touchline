import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";
import { SaveStatus } from "../save-status";
import { StorageWarning } from "../storage-warning";
import { useRoute } from "../use-route";
import { BackButton } from "./back-button";

export type BareShellProps = { children: ReactNode; storageAvailable: boolean };

/** The layout before a career exists: title, save status and a link to Settings (the only place to change the language). */
export function BareShell({ children, storageAvailable }: BareShellProps) {
  const { t } = useI18n();
  const onSettings = useRoute().name === "settings";
  return (
    <main className="app-shell">
      <header className="app-header">
        <BackButton hasCareer={false} />
        <h1 data-testid="app-title">{t("app.title")}</h1>
        <SaveStatus />
        {onSettings ? null : (
          <a
            data-testid="nav-settings"
            href={hrefFor({ name: "settings" })}
            aria-label={t("start.settings")}
            className="inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-text hover:bg-raised"
          >
            <Settings aria-hidden="true" className="size-[18px]" />
          </a>
        )}
      </header>
      {storageAvailable ? null : <StorageWarning />}
      {children}
    </main>
  );
}
