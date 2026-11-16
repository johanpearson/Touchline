import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

const cardStyles = cva("border border-line text-text", {
  variants: {
    tone: { surface: "bg-surface", raised: "bg-raised" },
    radius: { lg: "rounded-lg", xl: "rounded-xl" },
    padding: { none: "p-0", md: "p-4", lg: "p-6" },
  },
  defaultVariants: { tone: "surface", radius: "lg", padding: "md" },
});

export type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardStyles>;

/** A surface for grouped content: 18 px radius by default, 26 px (`xl`) for hero cards. */
export function Card({ tone, radius, padding, className, ...rest }: CardProps) {
  return <div {...rest} className={cn(cardStyles({ tone, radius, padding }), className)} />;
}
