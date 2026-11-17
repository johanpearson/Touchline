import { useMediaQuery } from "../components/use-media-query";

/** `sidebar`: 1100 px and wider. `rail`: 640 to 1099 px. `tabs`: below 640 px (phones). */
export type WidthMode = "sidebar" | "rail" | "tabs";

export const SIDEBAR_MIN_WIDTH = 1100;
export const RAIL_MIN_WIDTH = 640;

export function widthModeFor(width: number): WidthMode {
  if (width >= SIDEBAR_MIN_WIDTH) return "sidebar";
  return width >= RAIL_MIN_WIDTH ? "rail" : "tabs";
}

// Max-width queries (with the fractional pixel gap) so that an environment without `matchMedia`
// (tests, server rendering) falls back to the sidebar.
const BELOW_TABS = `(max-width: ${RAIL_MIN_WIDTH - 0.02}px)`;
const BELOW_SIDEBAR = `(max-width: ${SIDEBAR_MIN_WIDTH - 0.02}px)`;

/** The navigation layout for the current viewport width. */
export function useWidthMode(): WidthMode {
  const phone = useMediaQuery(BELOW_TABS);
  const narrow = useMediaQuery(BELOW_SIDEBAR);
  if (phone) return "tabs";
  return narrow ? "rail" : "sidebar";
}
