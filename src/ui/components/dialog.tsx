import * as RadixDialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { OverlayActions, OverlayHeader, scrimStyles } from "./overlay-parts";
import { useOverlayMotion } from "./use-overlay-motion";

export type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog; focus returns to it on close. */
  trigger?: ReactNode;
  title: string;
  description?: string;
  /** Translated accessible name of the close button. */
  closeLabel: string;
  children?: ReactNode;
  /** Buttons at the bottom, right-aligned. */
  actions?: ReactNode;
  /** Destructive confirms ignore outside clicks and hide the close button; Escape still closes. */
  destructive?: boolean;
  className?: string;
};

export function Dialog(props: DialogProps) {
  const motionProps = useOverlayMotion();
  const { destructive = false } = props;
  return (
    <RadixDialog.Root
      open={props.open}
      defaultOpen={props.defaultOpen}
      onOpenChange={props.onOpenChange}
    >
      {props.trigger ? <RadixDialog.Trigger asChild>{props.trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(scrimStyles, "grid place-items-center overflow-y-auto p-4")}
        >
          <RadixDialog.Content
            asChild
            onInteractOutside={destructive ? (e) => e.preventDefault() : undefined}
          >
            <motion.div
              {...motionProps}
              className={cn(
                "w-full max-w-lg rounded-xl border border-line bg-raised p-6 text-text shadow-xl",
                "focus:outline-none",
                props.className,
              )}
            >
              <OverlayHeader
                title={props.title}
                description={props.description}
                closeLabel={props.closeLabel}
                showClose={!destructive}
              />
              {props.children ? <div className="mt-4">{props.children}</div> : null}
              {props.actions ? <OverlayActions>{props.actions}</OverlayActions> : null}
            </motion.div>
          </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
