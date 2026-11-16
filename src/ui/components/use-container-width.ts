import { type RefObject, useLayoutEffect, useState } from "react";

/**
 * The element's own content width in px, kept current with a ResizeObserver, so layout follows the
 * container and not the viewport. `null` until measured, and when ResizeObserver is unavailable.
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
