import { DURATION } from "../motion/tokens";
import { useMediaQuery } from "./use-media-query";

type Values = Record<string, number | string>;

export type MotionProps = {
  initial: Values;
  animate: Values;
  exit: Values;
  transition: { duration: number; ease: "easeOut" };
};

type Offset = { x?: string; y?: string; scale?: number };

/**
 * Enter and exit animation for overlays; the exit mirrors the entrance and is a little faster. With
 * `prefers-reduced-motion: reduce` only the opacity changes (no movement or scaling); otherwise the
 * offset eases to rest. Only `opacity` and `transform` are animated.
 */
export function useOverlayMotion(from: Offset = { y: "8px", scale: 0.98 }): MotionProps {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: DURATION.fast, ease: "easeOut" },
    };
  }
  const away = { opacity: 0, x: from.x ?? 0, y: from.y ?? 0, scale: from.scale ?? 1 };
  return {
    initial: away,
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: away,
    transition: { duration: DURATION.base, ease: "easeOut" },
  };
}
