import { useEffect, useRef, useState } from "react";

/** How long a changed number stays highlighted, in milliseconds. */
export const FLASH_MS = 900;

/**
 * True for a short moment after `value` changes (never on the first render). It is a highlight,
 * not a counting animation: the new number is shown at once.
 */
export function useChangeFlash(value: unknown, duration: number = FLASH_MS): boolean {
  const previous = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    setFlash(true);
    const id = setTimeout(() => setFlash(false), duration);
    return () => clearTimeout(id);
  }, [value, duration]);
  return flash;
}
