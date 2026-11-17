import { motion } from "motion/react";
import { type ReactNode, useRef } from "react";
import { useReducedMotion, variantFor } from "../motion";
import { useRoute } from "../use-route";

/**
 * Fades and slides the page in when the route changes. There is no transition on the first
 * render, and only opacity and transform change, so nothing shifts in the layout. With reduced
 * motion the page only fades.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const route = useRoute();
  const reduced = useReducedMotion();
  const first = useRef(true);
  const variant = variantFor("slideUp", reduced);
  const initial = first.current ? false : variant.initial;
  first.current = false;
  return (
    <motion.div
      key={route.name}
      data-testid="route-transition"
      initial={initial}
      animate={variant.animate}
      transition={{ duration: variant.transition.duration, ease: variant.transition.ease }}
    >
      {children}
    </motion.div>
  );
}
