import { useI18n } from "../i18n-provider";
import { panelOpener, useMatchLock } from "../match-lock/match-lock";
import { useMatchInProgress } from "../match-session-provider";
import { hrefFor } from "../routes";
import { useCareer } from "../use-career";
import { useRoute } from "../use-route";
import { isNavCurrent, type NavItem, navRoute, navTestId } from "./nav-config";

export type NavEntry = {
  item: NavItem;
  href: string;
  current: boolean;
  label: string;
  testId: string;
  /** During a match the squad and tactics links open a panel over it instead of navigating. */
  openPanel?: () => void;
};

/** The given nav items with their link, label and current state; empty without a career. */
export function useNavEntries(items: readonly NavItem[]): NavEntry[] {
  const { t } = useI18n();
  const { career } = useCareer();
  const route = useRoute();
  const matchInProgress = useMatchInProgress(career);
  const lock = useMatchLock();
  if (!career) return [];
  return items.map((item) => {
    const target = navRoute(item, career.userClubId);
    const openPanel = panelOpener(lock, target);
    return {
      item,
      href: hrefFor(target),
      current: isNavCurrent(item, route, career.userClubId),
      label: t(item.id === "match" && matchInProgress ? "nav.resumeMatch" : item.labelKey),
      testId: navTestId(item),
      ...(openPanel ? { openPanel } : {}),
    };
  });
}

/** The click handler of a nav link: opens the panel instead of navigating when the entry has one. */
export const navClick =
  (entry: NavEntry, after?: () => void) =>
  (event: { preventDefault: () => void }): void => {
    if (entry.openPanel) {
      event.preventDefault();
      entry.openPanel();
    }
    after?.();
  };
