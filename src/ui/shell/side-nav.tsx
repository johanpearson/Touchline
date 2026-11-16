import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type KeyboardEvent, useEffect, useState } from "react";
import { cn, IconButton, Tooltip } from "../components";
import { useI18n } from "../i18n-provider";
import { LocaleSwitch } from "../locale-switch";
import { ThemeSwitch } from "../theme/theme-switch";
import { Brand } from "./brand";
import { NAV_ITEMS } from "./nav-config";
import { type NavEntry, useNavEntries } from "./use-nav-entries";

const linkStyles = cn(
  "flex min-h-11 items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2",
  "text-[15px] font-medium text-soft hover:bg-sunk hover:text-text",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  "aria-[current=page]:border-(--club) aria-[current=page]:bg-raised aria-[current=page]:font-semibold aria-[current=page]:text-text",
);

type LinkProps = { entry: NavEntry; compact: boolean; onNavigate: () => void };

function SideNavLink({ entry, compact, onNavigate }: LinkProps) {
  const Icon = entry.item.icon;
  const link = (
    <a
      data-testid={entry.testId}
      href={entry.href}
      aria-current={entry.current ? "page" : undefined}
      aria-label={compact ? entry.label : undefined}
      onClick={onNavigate}
      className={cn(linkStyles, compact && "justify-center px-0")}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      {compact ? null : <span className="truncate">{entry.label}</span>}
    </a>
  );
  return compact ? (
    <Tooltip content={entry.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function NavList({ compact, onNavigate }: { compact: boolean; onNavigate: () => void }) {
  const entries = useNavEntries(NAV_ITEMS);
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {entries.map((entry) => (
        <li key={entry.item.id}>
          <SideNavLink entry={entry} compact={compact} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}

type SideNavProps = {
  /** `sidebar`: 240 px with labels. `rail`: 72 px with icons, expandable to an overlay. */
  mode: "sidebar" | "rail";
};

/** The desktop sidebar and the tablet icon rail, one landmark so test ids stay unique. */
export function SideNav({ mode }: SideNavProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const overlay = mode === "rail" && expanded;
  const compact = mode === "rail" && !expanded;
  useEffect(() => {
    if (mode === "sidebar") setExpanded(false);
  }, [mode]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && expanded) setExpanded(false);
  };
  return (
    <div className={cn("shrink-0", mode === "sidebar" ? "w-60" : "w-18")}>
      {overlay ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="fixed inset-0 z-30 cursor-default bg-bg/70"
          onClick={() => setExpanded(false)}
        />
      ) : null}
      <nav
        aria-label={t("nav.label")}
        data-testid="career-nav"
        onKeyDown={onKeyDown}
        className={cn(
          "box-border flex h-dvh flex-col gap-4 overflow-y-auto border-r border-line bg-side p-3",
          mode === "sidebar" ? "sticky top-0" : "fixed inset-y-0 left-0",
          overlay ? "z-40 w-60 shadow-xl" : mode === "rail" && "z-20 w-18",
        )}
      >
        <div
          className={cn("flex items-center px-1", compact ? "justify-center" : "justify-between")}
        >
          <Brand hidden={compact} />
          {mode === "rail" ? (
            <IconButton
              size="sm"
              aria-expanded={expanded}
              label={t(expanded ? "shell.collapseNav" : "shell.expandNav")}
              icon={
                expanded ? (
                  <PanelLeftClose className="size-5" />
                ) : (
                  <PanelLeftOpen className="size-5" />
                )
              }
              onClick={() => setExpanded(!expanded)}
            />
          ) : null}
        </div>
        <NavList compact={compact} onNavigate={() => setExpanded(false)} />
        {compact ? null : (
          <div className="mt-auto flex flex-col gap-2 text-sm text-soft">
            <LocaleSwitch />
            <ThemeSwitch />
          </div>
        )}
      </nav>
    </div>
  );
}
