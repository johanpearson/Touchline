import { cva } from "class-variance-authority";
import type { FocusEvent, HTMLAttributes, Ref } from "react";
import { cn } from "./cn";

const scrollAreaStyles = cva(
  "scroll-smooth motion-reduce:scroll-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  {
    variants: {
      orientation: {
        horizontal: "scroll-hidden overflow-x-auto overflow-y-hidden",
        vertical: "scroll-thin overflow-y-auto overflow-x-hidden",
      },
      fade: { true: "scroll-fade", false: "" },
      snap: {
        true: "snap-x snap-mandatory motion-reduce:snap-none [&>*]:snap-start",
        false: "",
      },
    },
    defaultVariants: { orientation: "horizontal", fade: false, snap: false },
  },
);

export type ScrollAreaProps = Omit<HTMLAttributes<HTMLDivElement>, "aria-label" | "role"> & {
  ref?: Ref<HTMLDivElement>;
  /** Required: a scroll container is focusable, so it needs a name. */
  label: string;
  /** Horizontal (default) hides the scrollbar; vertical uses a thin themed one. */
  orientation?: "horizontal" | "vertical";
  /** Fades both edges so cut-off items read as continuing. Content is inset so nothing rests under it. */
  fade?: boolean;
  /** Snaps each direct child to the start edge. Off under `prefers-reduced-motion`. */
  snap?: boolean;
};

/**
 * A scroll container for club strips, wide tables and similar: never a default scrollbar, focusable
 * (`tabIndex=0`) and scrollable with the arrow keys. A focused child scrolls into view clear of the fade.
 */
export function ScrollArea({
  label,
  orientation,
  fade = false,
  snap = false,
  className,
  onFocus,
  ref,
  ...rest
}: ScrollAreaProps) {
  const keepFocusedInView = (event: FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    if (event.target !== event.currentTarget) {
      event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled, focusable scroll region is the pattern for keyboard-scrollable content
    <div
      {...rest}
      ref={ref}
      role="region"
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container must be focusable so keyboard users can scroll it
      tabIndex={0}
      onFocus={keepFocusedInView}
      className={cn(scrollAreaStyles({ orientation, fade, snap }), className)}
    />
  );
}
