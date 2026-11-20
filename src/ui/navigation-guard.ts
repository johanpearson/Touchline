/**
 * The hash router's change point: every route change goes through here before the app sees it, so a
 * screen can hold the user back (the running match) whatever caused the change: a link, the back
 * button of the browser, the palette or a script.
 *
 * A change the active guard blocks is undone before anyone is told, so the route the app shows
 * never changes. The guard gets the hash the user asked for and decides what happens next.
 */

export type NavigationGuard = {
  /** Whether the guard blocks route changes right now; asked on every change. */
  active: () => boolean;
  /** Called with the hash the user tried to go to (`#/league`) after the change has been undone. */
  onBlocked: (hash: string) => void;
};

const guards = new Set<NavigationGuard>();
const listeners = new Set<() => void>();
let attached = false;
let allowed: string | null = null;

/** The address the app last showed; a blocked change goes back to it. */
let shownUrl = "";

const blockingGuard = (): NavigationGuard | undefined =>
  [...guards].reverse().find((guard) => guard.active());

const onHashChange = () => {
  const url = window.location.href;
  // A change already dealt with (a blocked one, or the second event for one change) is not asked again.
  const changed = url !== shownUrl;
  const target = window.location.hash;
  const unguarded = changed && allowed === target;
  if (unguarded) allowed = null;
  const guard = changed && !unguarded ? blockingGuard() : undefined;
  if (guard) {
    // Replaces the entry the change made, so the address bar and the history show the match again.
    window.history.replaceState(window.history.state, "", shownUrl);
    guard.onBlocked(target);
    return;
  }
  shownUrl = url;
  for (const listener of [...listeners]) listener();
};

const attach = () => {
  if (attached) return;
  attached = true;
  shownUrl = window.location.href;
  window.addEventListener("hashchange", onHashChange);
};

const detachWhenUnused = () => {
  if (!attached || guards.size > 0 || listeners.size > 0) return;
  attached = false;
  window.removeEventListener("hashchange", onHashChange);
};

/** Tells `listener` after every route change that was not blocked. Returns the unsubscribe function. */
export const subscribeRoute = (listener: () => void): (() => void) => {
  listeners.add(listener);
  attach();
  return () => {
    listeners.delete(listener);
    detachWhenUnused();
  };
};

const hashOfUrl = (url: string): string => {
  const index = url.indexOf("#");
  return index === -1 ? "" : url.slice(index);
};

/**
 * The hash of the route the app shows. While a guard is active that is the last hash it let
 * through, even in the moment between the address changing and its event, so a blocked change
 * never reaches the screens.
 */
export const getRouteHash = (): string =>
  blockingGuard() ? hashOfUrl(shownUrl) : window.location.hash;

/** Blocks route changes while `guard.active()` is true. Returns the function that removes it. */
export const registerNavigationGuard = (guard: NavigationGuard): (() => void) => {
  guards.add(guard);
  attach();
  return () => {
    guards.delete(guard);
    detachWhenUnused();
  };
};

/** Goes to `hash` without asking the guards, for a destination the user already confirmed. */
export const navigateUnguarded = (hash: string): void => {
  if (window.location.hash === hash) return;
  allowed = hash;
  window.location.hash = hash;
};
