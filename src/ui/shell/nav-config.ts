import {
  CirclePlay,
  House,
  type LucideIcon,
  Save,
  Settings,
  Shield,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import type { MessageKey } from "../../i18n";
import type { Route } from "../routes";

/** A route a link can point to (everything but the not-found placeholder). */
export type LinkRoute = Exclude<Route, { name: "not-found" }>;

export type NavId =
  | "hub"
  | "squad"
  | "tactics"
  | "match"
  | "league"
  | "club"
  | "saves"
  | "settings";

export type NavItem = {
  id: NavId;
  labelKey: MessageKey;
  icon: LucideIcon;
  /** The route the item links to; the club item needs the user's club. */
  route: (userClubId: string) => LinkRoute;
  /** `tab`: one of the phone bottom tabs. `more`: listed in the More drawer on phones. */
  phone: "tab" | "more";
};

/**
 * The single source for the sidebar, the icon rail, the phone tab bar and the More drawer. A new
 * screen adds one entry here (in the order it should appear in the sidebar).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "hub", labelKey: "nav.hub", icon: House, route: () => ({ name: "home" }), phone: "tab" },
  {
    id: "squad",
    labelKey: "nav.squad",
    icon: Users,
    route: () => ({ name: "squad" }),
    phone: "tab",
  },
  {
    id: "tactics",
    labelKey: "nav.tactics",
    icon: SlidersHorizontal,
    route: () => ({ name: "tactics" }),
    phone: "more",
  },
  {
    id: "match",
    labelKey: "nav.match",
    icon: CirclePlay,
    route: () => ({ name: "match" }),
    phone: "tab",
  },
  {
    id: "league",
    labelKey: "nav.league",
    icon: Trophy,
    route: () => ({ name: "league" }),
    phone: "tab",
  },
  {
    id: "club",
    labelKey: "nav.club",
    icon: Shield,
    route: (clubId) => ({ name: "club", clubId }),
    phone: "more",
  },
  {
    id: "saves",
    labelKey: "nav.saves",
    icon: Save,
    route: () => ({ name: "saves" }),
    phone: "more",
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    icon: Settings,
    route: () => ({ name: "settings" }),
    phone: "more",
  },
];

export const navRoute = (item: NavItem, userClubId: string): LinkRoute => item.route(userClubId);

/** Stable selector used by the end-to-end specs. */
export const navTestId = (item: NavItem): string => `nav-${item.id}`;

export const phoneTabItems = (): readonly NavItem[] => NAV_ITEMS.filter((i) => i.phone === "tab");

export const moreItems = (): readonly NavItem[] => NAV_ITEMS.filter((i) => i.phone === "more");

/** True when `route` is the page the item links to. */
export const isNavCurrent = (item: NavItem, route: Route, userClubId: string): boolean => {
  const target = item.route(userClubId);
  if (target.name !== route.name) return false;
  return target.name !== "club" || (route.name === "club" && route.clubId === target.clubId);
};
