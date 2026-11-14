export type Route =
  | { name: "home" }
  | { name: "league" }
  | { name: "club"; clubId: string }
  | { name: "match" }
  | { name: "results" }
  | { name: "season-end" }
  | { name: "saves" }
  | { name: "squad" }
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
  if (arg !== undefined) return NOT_FOUND;
  if (
    head === "league" ||
    head === "match" ||
    head === "results" ||
    head === "season-end" ||
    head === "saves" ||
    head === "squad"
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
    default:
      return `#/${route.name}`;
  }
};
