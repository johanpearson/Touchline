import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { OverlayHeader, scrimStyles } from "./overlay-parts";
import { useMediaQuery } from "./use-media-query";
import { useOpenState } from "./use-open-state";
import { useOverlayMotion } from "./use-overlay-motion";

export type DrawerProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  closeLabel: string;
  children?: ReactNode;
  /** Which edge the sheet uses at 640 px and wider. Below that it is always a bottom sheet. */
  side?: "left" | "right";
  className?: string;
  /** Moves focus to the title when the sheet opens, instead of to its first control. */
  focusTitle?: boolean;
};

const focusHeading = (event: Event) => {
  event.preventDefault();
  const content = event.currentTarget as HTMLElement | null;
  content?.querySelector<HTMLElement>("[data-overlay-title]")?.focus();
};

const PHONE = "(max-width: 639.98px)";

/** Side sheet on tablet and desktop, bottom sheet on phones. */
export function Drawer(props: DrawerProps) {
  const { side = "right" } = props;
  const phone = useMediaQuery(PHONE);
  const [open, setOpen] = useOpenState(props);
  const motionProps = useOverlayMotion(
    phone ? { y: "100%" } : { x: side === "right" ? "100%" : "-100%" },
  );
  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      {props.trigger ? <RadixDialog.Trigger asChild>{props.trigger}</RadixDialog.Trigger> : null}
      <AnimatePresence>
        {open ? (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={motionProps.transition}
                className={scrimStyles}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content
              asChild
              forceMount
              onOpenAutoFocus={props.focusTitle ? focusHeading : undefined}
            >
              <motion.div
                {...motionProps}
                data-side={side}
                className={cn(
                  "fixed z-50 flex flex-col gap-4 overflow-y-auto border-line bg-raised p-6 text-text shadow-xl",
                  "focus:outline-none",
                  "max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:rounded-t-xl max-sm:border-t",
                  "sm:inset-y-0 sm:w-96 sm:max-w-full",
                  side === "right" ? "sm:right-0 sm:border-l" : "sm:left-0 sm:border-r",
                  props.className,
                )}
              >
                <OverlayHeader
                  title={props.title}
                  description={props.description}
                  closeLabel={props.closeLabel}
                  showClose
                />
                {props.children}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        ) : null}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}
