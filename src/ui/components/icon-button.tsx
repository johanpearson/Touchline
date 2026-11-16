import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { type ButtonVariants, buttonStyles } from "./button-styles";
import { cn } from "./cn";

const squareSize = cva("", {
  variants: {
    size: { sm: "size-9 pointer-coarse:size-11", md: "size-11", lg: "size-12" },
  },
  defaultVariants: { size: "md" },
});

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "aria-labelledby" | "children"
> &
  ButtonVariants & {
    ref?: Ref<HTMLButtonElement>;
    /** Required: an icon alone has no name for screen readers. */
    label: string;
    /** The icon, rendered decorative (`aria-hidden`); the label carries the meaning. */
    icon: ReactNode;
  };

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      className={cn(
        buttonStyles({ variant, size }),
        "px-0 min-h-0",
        squareSize({ size }),
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
}
