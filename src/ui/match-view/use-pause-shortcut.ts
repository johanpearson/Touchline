import { useEffect } from "react";

/** Elements that use Space themselves: typing, activating a button or link, choosing an option. */
const OWN_SPACE = "input, textarea, select, button, a, summary, [contenteditable], [role]";
/** Roles that do not use Space, so a focused element with one of them still lets Space pause. */
const PASSIVE_ROLES = new Set(["img", "region", "group", "status", "tabpanel", "presentation"]);

const usesSpace = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  const owner = target.closest(OWN_SPACE);
  if (!owner) return false;
  const role = owner.getAttribute("role");
  return !(role && PASSIVE_ROLES.has(role) && owner.tagName !== "BUTTON");
};

const hasModifier = (event: KeyboardEvent): boolean =>
  event.ctrlKey || event.metaKey || event.altKey;

const isPauseKey = (event: KeyboardEvent): boolean =>
  event.key === " " && !event.defaultPrevented && !event.repeat && !hasModifier(event);

const spaceIsTaken = (event: KeyboardEvent): boolean =>
  usesSpace(event.target) || document.querySelector('[role="dialog"]') !== null;

/**
 * Space toggles `onToggle` while `enabled`, unless an input, button, link or similar has focus
 * (Space belongs to it) or a dialog is open.
 */
export const usePauseShortcut = (enabled: boolean, onToggle: () => void): void => {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPauseKey(event) || spaceIsTaken(event)) return;
      event.preventDefault();
      onToggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onToggle]);
};
