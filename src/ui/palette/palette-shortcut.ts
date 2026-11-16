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

const hasCommandModifier = (event: ShortcutEvent): boolean => event.ctrlKey || event.metaKey;

const hasOtherModifier = (event: ShortcutEvent): boolean => event.altKey || event.shiftKey;

const isUnused = (event: ShortcutEvent): boolean =>
  !event.defaultPrevented && !insideOptOut(event.target);

/** True for Ctrl+K or Cmd+K that nothing else has used. */
export function isPaletteShortcut(event: ShortcutEvent): boolean {
  if (event.key.toLowerCase() !== "k") return false;
  if (!hasCommandModifier(event)) return false;
  if (hasOtherModifier(event)) return false;
  return isUnused(event);
}
