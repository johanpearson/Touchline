import { useMediaQuery } from "../components/use-media-query";

/** True when the user asked the system for less motion (`prefers-reduced-motion: reduce`). */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
