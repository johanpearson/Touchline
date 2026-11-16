import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";
import { cn } from "./cn";

export type TooltipProps = {
  /** The text shown. Never the only place for essential information. */
  content: string;
  /** The element that triggers it; it must accept a ref and focus. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  /** Hover delay in milliseconds; keyboard focus opens it at once. */
  delayDuration?: number;
  className?: string;
};

export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 300,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 max-w-64 rounded-sm border border-line bg-raised px-3 py-1.5 text-[13px] text-text shadow-lg",
              className,
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
