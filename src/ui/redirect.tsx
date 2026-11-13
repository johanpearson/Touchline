import { useEffect } from "react";
import { hrefFor, type Route } from "./routes";

/** Sends the user to another route as soon as it renders; used by the route guards. */
export function Redirect({ to }: { to: Exclude<Route, { name: "not-found" }> }) {
  useEffect(() => {
    window.location.hash = hrefFor(to);
  }, [to]);
  return null;
}
