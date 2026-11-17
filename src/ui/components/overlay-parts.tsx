import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./icon-button";

/** Title, optional description and close button shared by Dialog and Drawer. */
export function OverlayHeader(props: {
  title: string;
  description?: string;
  closeLabel: string;
  showClose: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <RadixDialog.Title
          tabIndex={-1}
          data-overlay-title=""
          className="font-heading text-2xl font-semibold text-text focus:outline-none"
        >
          {props.title}
        </RadixDialog.Title>
        {props.description ? (
          <RadixDialog.Description className="mt-1 text-[15px] text-soft">
            {props.description}
          </RadixDialog.Description>
        ) : (
          <RadixDialog.Description className="sr-only">{props.title}</RadixDialog.Description>
        )}
      </div>
      {props.showClose ? (
        <RadixDialog.Close asChild>
          <IconButton label={props.closeLabel} icon={<X className="size-5" />} />
        </RadixDialog.Close>
      ) : null}
    </div>
  );
}

export function OverlayActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-3">{children}</div>;
}

export const scrimStyles = "fixed inset-0 z-50 bg-bg/70";
