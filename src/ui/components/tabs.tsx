import * as RadixTabs from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";
import { cn } from "./cn";

/** Radix Tabs: roving tabindex, arrow keys, Home and End. Automatic activation by default. */
export const Tabs = RadixTabs.Root;

export type TabsListProps = ComponentProps<typeof RadixTabs.List>;

/** `aria-label` is required: a tab list needs a name. */
export function TabsList({ className, ...rest }: TabsListProps & { "aria-label": string }) {
  return (
    <RadixTabs.List {...rest} className={cn("inline-flex max-w-full gap-1 overflow-x-auto border-b border-line", className)} />
  );
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      {...rest}
      className={cn(
        "min-h-11 cursor-pointer border-0 border-b-2 border-solid border-transparent bg-transparent px-4 text-[15px] font-semibold text-muted",
        "transition-colors duration-150 hover:text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=active]:border-accent data-[state=active]:text-text",
        className,
      )}
    />
  );
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      {...rest}
      className={cn(
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className,
      )}
    />
  );
}
