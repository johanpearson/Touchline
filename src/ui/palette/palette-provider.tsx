import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isPaletteShortcut } from "./palette-shortcut";

type PaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Stops the keyboard shortcut from opening the palette until the returned function is called. */
  suspendShortcut: () => () => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

/** Owns the open state of the command palette and listens for Ctrl/Cmd+K. */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const suspended = useRef(0);

  const suspendShortcut = useCallback(() => {
    suspended.current += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      suspended.current -= 1;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event) || suspended.current > 0) return;
      // Keeps the browser's own Ctrl+K (address bar or search) from taking the key.
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen, suspendShortcut }), [open, suspendShortcut]);
  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteContextValue {
  const value = useContext(PaletteContext);
  if (!value) throw new Error("usePalette must be used inside PaletteProvider");
  return value;
}

/**
 * While `active`, Ctrl/Cmd+K does not open the palette (a running match). Without a provider
 * (a screen rendered on its own) it does nothing.
 */
export function useSuspendPaletteShortcut(active: boolean): void {
  const value = useContext(PaletteContext);
  const suspend = value?.suspendShortcut;
  useEffect(() => {
    if (!active || !suspend) return;
    return suspend();
  }, [active, suspend]);
}
