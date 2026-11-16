export type ShortcutEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
};

/** Marks an element (and what is inside it) whose own Ctrl+K handling the palette must not take. */
export const SHORTCUT_OFF_ATTRIBUTE = "data-palette-shortcut";

const insideOptOut = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(`[${SHORTCUT_OFF_ATTRIBUTE}="off"]`) !== null;

/** True for Ctrl+K or Cmd+K that nothing else has used. */
export function isPaletteShortcut(event: ShortcutEvent): boolean {
  if (event.key.toLowerCase() !== "k") return false;
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return false;
  return !event.defaultPrevented && !insideOptOut(event.target);
}
