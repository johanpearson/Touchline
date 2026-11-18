export type Route =
  | { name: "home" }
  | { name: "league" }
  | { name: "club"; clubId: string }
  | { name: "player"; playerId: string }
  | { name: "match" }
  | { name: "results" }
  | { name: "season-end" }
  | { name: "off-season" }
  | { name: "saves" }
  | { name: "settings" }
  | { name: "squad" }
  | { name: "tactics" }
  | { name: "market" }
  | { name: "new" }
  | { name: "new-club" }
  | { name: "not-found" };

const SIMPLE_NAMES = [
  "league",
  "match",
  "results",
  "season-end",
  "off-season",
  "saves",
  "settings",
  "squad",
  "tactics",
  "market",
  "new",
] as const;
type SimpleRoute = (typeof SIMPLE_NAMES)[number];
const SIMPLE_ROUTES: ReadonlySet<string> = new Set(SIMPLE_NAMES);

const NOT_FOUND: Route = { name: "not-found" };

const decode = (part: string): string | null => {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
};

/** Parses a location hash such as `#/club/kvarnby` into a route. */
export const parseRoute = (hash: string): Route => {
  const path = hash.replace(/^#/, "");
  const parts = path.split("/").filter((part) => part !== "");
  const [head, arg, ...rest] = parts;
  if (rest.length > 0) return NOT_FOUND;
  if (head === undefined) return arg === undefined ? { name: "home" } : NOT_FOUND;
  if (head === "club") {
    const clubId = arg === undefined ? null : decode(arg);
    return clubId === null || clubId === "" ? NOT_FOUND : { name: "club", clubId };
  }
  if (head === "player") {
    const playerId = arg === undefined ? null : decode(arg);
    return playerId === null || playerId === "" ? NOT_FOUND : { name: "player", playerId };
  }
  if (head === "new" && arg === "club") return { name: "new-club" };
  if (arg !== undefined) return NOT_FOUND;
  if (SIMPLE_ROUTES.has(head)) return { name: head as SimpleRoute };
  return NOT_FOUND;
};

/** The hash link that opens the given route. */
export const hrefFor = (route: Exclude<Route, { name: "not-found" }>): string => {
  switch (route.name) {
    case "home":
      return "#/";
    case "club":
      return `#/club/${encodeURIComponent(route.clubId)}`;
    case "player":
      return `#/player/${encodeURIComponent(route.playerId)}`;
    case "new-club":
      return "#/new/club";
    default:
      return `#/${route.name}`;
  }
};

/** The parent of every route; `null` marks the root (home, which is the start screen without a career). */
const PARENTS: Record<Route["name"], Route | null> = {
  home: null,
  league: { name: "home" },
  club: { name: "home" },
  player: { name: "squad" },
  match: { name: "home" },
  results: { name: "home" },
  "season-end": { name: "home" },
  "off-season": { name: "home" },
  saves: { name: "home" },
  settings: { name: "home" },
  squad: { name: "home" },
  tactics: { name: "home" },
  market: { name: "home" },
  new: { name: "home" },
  "new-club": { name: "new" },
  "not-found": { name: "home" },
};

/** Screens a profile can be opened from, so back returns there instead of to the squad. */
const PROFILE_REFERRERS: readonly Route["name"][] = [
  "club",
  "market",
  "league",
  "squad",
  "tactics",
];

/**
 * The screen the back action leads to: the route's parent, except that a profile goes back to the
 * valid screen it was opened from (`referrer`). Returns `null` for the root.
 */
export const parentOf = (route: Route, referrer?: Route | null): Route | null => {
  if (route.name === "player" && referrer && PROFILE_REFERRERS.includes(referrer.name)) {
    return referrer;
  }
  return PARENTS[route.name];
};
