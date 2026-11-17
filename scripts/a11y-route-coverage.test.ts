// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTE_STATES } from "../e2e/a11y-routes";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const routeNames = [...read("src/ui/routes.ts").matchAll(/\{ name: "([a-z-]+)"/g)].map(
  (match) => match[1],
);
const stateNames = new Set(
  [...read("e2e/visual/screen-states.ts").matchAll(/name: "([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  ),
);

describe("accessibility audit coverage", () => {
  it("finds the routes in routes.ts", () => {
    expect(routeNames).toContain("home");
    expect(routeNames).toContain("not-found");
  });

  it("audits every route with at least one registered screen state", () => {
    const missing = [...new Set(routeNames)].filter((name) => !ROUTE_STATES[name]?.length);
    expect(missing).toEqual([]);
  });

  it("only names registered screen states", () => {
    const unknown = Object.values(ROUTE_STATES)
      .flat()
      .filter((state) => !stateNames.has(state));
    expect(unknown).toEqual([]);
  });

  it("has no entry for a route that no longer exists", () => {
    const stale = Object.keys(ROUTE_STATES).filter((name) => !routeNames.includes(name));
    expect(stale).toEqual([]);
  });
});
