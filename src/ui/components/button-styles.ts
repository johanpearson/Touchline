import { cva, type VariantProps } from "class-variance-authority";

/**
 * Shared look of Button and IconButton. Primary is always the app accent (amber), never a club
 * colour. Targets are at least 44 px: `md` and `lg` always, `sm` on touch (coarse pointers).
 */
export const buttonStyles = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold select-none",
    "transition-colors duration-150 cursor-pointer",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:brightness-110",
        secondary: "border border-line bg-raised text-text hover:bg-glow",
        ghost: "bg-transparent text-soft hover:bg-sunk hover:text-text",
        destructive: "border border-bad bg-transparent text-bad hover:bg-sunk",
      },
      size: {
        sm: "min-h-9 px-3 text-[13px] pointer-coarse:min-h-11",
        md: "min-h-11 px-4 text-[15px]",
        lg: "min-h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonVariants = VariantProps<typeof buttonStyles>;
