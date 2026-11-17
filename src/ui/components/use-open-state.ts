import { useState } from "react";

type OpenProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * The open state of an overlay, controlled when `open` is given and otherwise kept here. Overlays
 * need to know it themselves so they can keep their content mounted while the exit plays.
 */
export function useOpenState(props: OpenProps): [boolean, (open: boolean) => void] {
  const [inner, setInner] = useState(props.defaultOpen ?? false);
  const open = props.open ?? inner;
  const setOpen = (next: boolean) => {
    setInner(next);
    props.onOpenChange?.(next);
  };
  return [open, setOpen];
}
