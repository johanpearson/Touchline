import type { ReactNode } from "react";
import { useI18n } from "../i18n-provider";
import { LocaleSwitch } from "../locale-switch";
import { SaveStatus } from "../save-status";
import { StorageWarning } from "../storage-warning";
import { ThemeSwitch } from "../theme/theme-switch";

export type BareShellProps = { children: ReactNode; storageAvailable: boolean };

/** The layout before a career exists: title and switches only. The start flow issues replace it. */
export function BareShell({ children, storageAvailable }: BareShellProps) {
  const { t } = useI18n();
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 data-testid="app-title">{t("app.title")}</h1>
        <SaveStatus />
        <LocaleSwitch />
        <ThemeSwitch />
      </header>
      {storageAvailable ? null : <StorageWarning />}
      {children}
    </main>
  );
}
