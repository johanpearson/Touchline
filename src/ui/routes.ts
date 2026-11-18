export type Route =
  | { name: "home" }
  | { name: "league" }
  | { name: "club"; clubId: string }
  | { name: "player"; playerId: string }
  | { name: "match" }
  | { name: "results" }
  | { name: "season-end" }
  | { name: "saves" }
  | { name: "settings" }
  | { name: "squad" }
  | { name: "tactics" }
  | { name: "market" }
  | { name: "new" }
  | { name: "new-club" }
  | { name: "not-found" };

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
  if (
    head === "league" ||
    head === "match" ||
    head === "results" ||
    head === "season-end" ||
    head === "saves" ||
    head === "settings" ||
    head === "squad" ||
    head === "tactics" ||
    head === "market" ||
    head === "new"
  )
    return { name: head };
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
