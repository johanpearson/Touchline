import { parentOf, parseRoute, type Route } from "../routes";
import { useRoute } from "../use-route";

let previousHash: string | null = null;

const hashOf = (url: string): string => {
  const index = url.indexOf("#");
  return index === -1 ? "" : url.slice(index);
};

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", (event) => {
    previousHash = hashOf(event.oldURL);
  });
}

/** The route the user navigated from, or `null` when unknown (first page, reload). */
export const referrerRoute = (hash: string | null = previousHash): Route | null =>
  hash ? parseRoute(hash) : null;

/** Where the back action of the current screen leads, or `null` on the root. */
export function useBackTarget(): Route | null {
  const route = useRoute();
  return parentOf(route, referrerRoute());
}
