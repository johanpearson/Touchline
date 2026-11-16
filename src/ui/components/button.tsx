import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { type ButtonVariants, buttonStyles } from "./button-styles";
import { cn } from "./cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariants & {
    ref?: Ref<HTMLButtonElement>;
    /** Shows a spinner, blocks clicks and announces `loadingLabel` to assistive technology. */
    loading?: boolean;
    /** Text announced while loading (translated by the caller). */
    loadingLabel?: string;
    /** Renders the child element (for example a link) with the button's look. */
    asChild?: boolean;
    children?: ReactNode;
  };

export function Button({
  variant,
  size,
  loading = false,
  loadingLabel,
  asChild = false,
  className,
  disabled,
  type = "button",
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const blocked = disabled || loading;
  return (
    <Comp
      {...rest}
      type={asChild ? undefined : type}
      disabled={asChild ? undefined : blocked}
      aria-disabled={asChild && blocked ? true : undefined}
      aria-busy={loading || undefined}
      onClick={blocked ? (e: { preventDefault: () => void }) => e.preventDefault() : onClick}
      className={cn(buttonStyles({ variant, size }), className)}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {children}
          {loading && loadingLabel ? (
            <span role="status" className="sr-only">
              {loadingLabel}
            </span>
          ) : null}
        </>
      )}
    </Comp>
  );
}
