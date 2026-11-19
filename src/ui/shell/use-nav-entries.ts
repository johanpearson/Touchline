import { useI18n } from "../i18n-provider";
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
};

/** The given nav items with their link, label and current state; empty without a career. */
export function useNavEntries(items: readonly NavItem[]): NavEntry[] {
  const { t } = useI18n();
  const { career } = useCareer();
  const route = useRoute();
  const matchInProgress = useMatchInProgress(career);
  if (!career) return [];
  return items.map((item) => ({
    item,
    href: hrefFor(navRoute(item, career.userClubId)),
    current: isNavCurrent(item, route, career.userClubId),
    label: t(item.id === "match" && matchInProgress ? "nav.resumeMatch" : item.labelKey),
    testId: navTestId(item),
  }));
}
