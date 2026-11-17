import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

const badgeStyles = cva(
  "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-[13px] font-semibold tabular",
  {
    variants: {
      tone: {
        neutral: "border-line bg-raised text-soft",
        good: "border-good bg-sunk text-good",
        bad: "border-bad bg-sunk text-bad",
        info: "border-info bg-sunk text-info",
        warn: "border-warn bg-sunk text-warn",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeStyles>;

/** A small status chip. The text always carries the meaning; the colour only reinforces it. */
export function Badge({ tone, className, ...rest }: BadgeProps) {
  return <span {...rest} className={cn(badgeStyles({ tone }), className)} />;
}
