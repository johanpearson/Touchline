import { hrefFor, parseRoute } from "./routes";

const FALLBACK = hrefFor({ name: "squad" });

/** The in-app page to go back to: the previous page, unless it is unknown or another profile. */
export const backHref = (previousHash: string | null): string => {
  if (!previousHash) return FALLBACK;
  const route = parseRoute(previousHash);
  return route.name === "not-found" || route.name === "player" ? FALLBACK : previousHash;
};

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

/** Where the back link of a screen points, from the last in-app navigation. */
export const currentBackHref = (): string => backHref(previousHash);
