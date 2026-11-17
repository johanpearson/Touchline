import { DURATION } from "../motion/tokens";
import { useMediaQuery } from "./use-media-query";

export type MotionProps = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  transition: { duration: number; ease: "easeOut" };
};

type Offset = { x?: string; y?: string; scale?: number };

/**
 * Enter animation for overlays. With `prefers-reduced-motion: reduce` only the opacity changes
 * (no movement or scaling); otherwise the offset eases to rest.
 */
export function useOverlayMotion(from: Offset = { y: "8px", scale: 0.98 }): MotionProps {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: DURATION.fast, ease: "easeOut" },
    };
  }
  return {
    initial: { opacity: 0, x: from.x ?? 0, y: from.y ?? 0, scale: from.scale ?? 1 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    transition: { duration: DURATION.base, ease: "easeOut" },
  };
}
