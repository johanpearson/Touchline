import { useSyncExternalStore } from "react";
import { parseRoute, type Route } from "./routes";

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

const getHash = (): string => window.location.hash;

/** The current route from the location hash; updates on back, forward and link clicks. */
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return parseRoute(hash);
}
