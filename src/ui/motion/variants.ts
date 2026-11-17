import { DURATION, EASE, SLIDE_PX } from "./tokens";

export type MotionState = { opacity: number; y?: number; scale?: number };

export type Variant = {
  initial: MotionState;
  animate: MotionState;
  exit: MotionState;
  transition: { duration: number; ease: readonly [number, number, number, number] };
};

const fadeOnly = (duration: number): Variant => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration, ease: EASE.out },
});

export type VariantName = "fade" | "slideUp" | "scale";

const full: Record<VariantName, Variant> = {
  fade: fadeOnly(DURATION.base),
  slideUp: {
    initial: { opacity: 0, y: SLIDE_PX },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 0 },
    transition: { duration: DURATION.base, ease: EASE.out },
  },
  scale: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1 },
    transition: { duration: DURATION.base, ease: EASE.out },
  },
};

/**
 * The shared entrance variants. With reduced motion every variant is an opacity-only fade, so
 * nothing moves or scales; only `transform` and `opacity` are ever animated.
 */
export function variantFor(name: VariantName, reduced: boolean): Variant {
  return reduced ? fadeOnly(DURATION.fast) : full[name];
}
