import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type KeyboardEvent, useEffect, useState } from "react";
import { cn, IconButton, Tooltip } from "../components";
import { useI18n } from "../i18n-provider";
import { DURATION, EASE, useReducedMotion } from "../motion";
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

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <motion.button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="fixed inset-0 z-30 cursor-default bg-bg/70"
      onClick={onClose}
    />
  );
}

function RailToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const Icon = expanded ? PanelLeftClose : PanelLeftOpen;
  return (
    <IconButton
      size="sm"
      aria-expanded={expanded}
      label={t(expanded ? "shell.collapseNav" : "shell.expandNav")}
      icon={<Icon className="size-5" />}
      onClick={onToggle}
    />
  );
}

/** Width in pixels of the icon rail and of the rail expanded to an overlay (w-18, w-60). */
const RAIL_CLOSED = 72;
const RAIL_OPEN = 240;

const navStyles = (mode: SideNavProps["mode"], overlay: boolean): string =>
  cn(
    "box-border flex h-dvh flex-col gap-4 overflow-y-auto border-r border-line bg-side p-3",
    mode === "sidebar" ? "sticky top-0" : "fixed inset-y-0 left-0 z-20 overflow-x-hidden",
    overlay && "z-40 shadow-xl",
  );

/** Expanded state of the rail: collapses on Escape and whenever the layout is the sidebar. */
function useRailExpansion(mode: SideNavProps["mode"]) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (mode === "sidebar") setExpanded(false);
  }, [mode]);
  const collapse = () => setExpanded(false);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") collapse();
  };
  return { expanded, toggle: () => setExpanded(!expanded), collapse, onKeyDown };
}

/** The desktop sidebar and the tablet icon rail, one landmark so test ids stay unique. */
export function SideNav({ mode }: SideNavProps) {
  const { t } = useI18n();
  const rail = mode === "rail";
  const { expanded, toggle, collapse, onKeyDown } = useRailExpansion(mode);
  const overlay = rail && expanded;
  const compact = rail && !expanded;
  const reduced = useReducedMotion();
  return (
    <div className={cn("shrink-0", rail ? "w-18" : "w-60")}>
      <AnimatePresence>{overlay ? <Scrim onClose={collapse} /> : null}</AnimatePresence>
      <motion.nav
        aria-label={t("nav.label")}
        data-testid="career-nav"
        onKeyDown={onKeyDown}
        initial={false}
        animate={rail ? { width: overlay ? RAIL_OPEN : RAIL_CLOSED } : undefined}
        transition={{ duration: reduced ? 0 : DURATION.base, ease: EASE.out }}
        className={navStyles(mode, overlay)}
      >
        <div
          className={cn("flex items-center px-1", compact ? "justify-center" : "justify-between")}
        >
          <Brand hidden={compact} />
          {rail ? <RailToggle expanded={expanded} onToggle={toggle} /> : null}
        </div>
        <NavList compact={compact} onNavigate={collapse} />
      </motion.nav>
    </div>
  );
}
