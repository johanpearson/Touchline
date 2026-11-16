import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** A placeholder block while content loads. Decorative: hidden from assistive technology. */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      {...rest}
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-track", className)}
    />
  );
}
