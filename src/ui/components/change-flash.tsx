import type { ReactNode } from "react";
import { useChangeFlash } from "../motion/use-change-flash";
import { cn } from "./cn";

/** Wraps a number (or any text) and tints it briefly when `value` changes. No counting animation. */
export function ChangeFlash(props: { value: unknown; children: ReactNode; className?: string }) {
  const flash = useChangeFlash(props.value);
  return (
    <span
      data-flash={flash ? "true" : undefined}
      className={cn(
        "rounded-sm transition-colors duration-700 motion-reduce:transition-none",
        "data-[flash=true]:bg-glow data-[flash=true]:duration-0",
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}
