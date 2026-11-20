import { useSyncExternalStore } from "react";
import { getRouteHash, subscribeRoute } from "./navigation-guard";
import { parseRoute, type Route } from "./routes";

/** The current route from the location hash; updates on back, forward and link clicks, unless a guard blocks the change. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeRoute, getRouteHash);
  return parseRoute(hash);
}
