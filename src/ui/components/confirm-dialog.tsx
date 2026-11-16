import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

export type ConfirmDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  onConfirm: () => void;
  /** Destructive confirms use the destructive button and ignore outside clicks. */
  destructive?: boolean;
  /** Disables the confirm button while the action runs. */
  busy?: boolean;
  confirmTestId?: string;
};

/** Replaces the ad hoc inline confirm blocks: a yes/no question in a dialog. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { destructive = false } = props;
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      trigger={props.trigger}
      title={props.title}
      description={props.description}
      closeLabel={props.closeLabel}
      destructive={destructive}
      actions={
        <>
          <RadixDialog.Close asChild>
            <Button variant="ghost">{props.cancelLabel}</Button>
          </RadixDialog.Close>
          <Button
            variant={destructive ? "destructive" : "primary"}
            disabled={props.busy}
            data-testid={props.confirmTestId}
            onClick={props.onConfirm}
          >
            {props.confirmLabel}
          </Button>
        </>
      }
    />
  );
}
