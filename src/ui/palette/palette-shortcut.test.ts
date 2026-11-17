import { describe, expect, it } from "vitest";
import { isPaletteShortcut, type ShortcutEvent } from "./palette-shortcut";

const press = (over: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key: "k",
  ctrlKey: true,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  defaultPrevented: false,
  target: null,
  ...over,
});

describe("isPaletteShortcut", () => {
  it("accepts Ctrl+K and Cmd+K, in either case", () => {
    expect(isPaletteShortcut(press())).toBe(true);
    expect(isPaletteShortcut(press({ key: "K" }))).toBe(true);
    expect(isPaletteShortcut(press({ ctrlKey: false, metaKey: true }))).toBe(true);
  });

  it("ignores K without a modifier and other keys", () => {
    expect(isPaletteShortcut(press({ ctrlKey: false }))).toBe(false);
    expect(isPaletteShortcut(press({ key: "j" }))).toBe(false);
  });

  it("ignores combinations with Alt or Shift", () => {
    expect(isPaletteShortcut(press({ altKey: true }))).toBe(false);
    expect(isPaletteShortcut(press({ shiftKey: true }))).toBe(false);
  });

  it("ignores a key press another handler already used", () => {
    expect(isPaletteShortcut(press({ defaultPrevented: true }))).toBe(false);
  });

  it("ignores a press inside a field that opts out", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-palette-shortcut", "off");
    const input = document.createElement("input");
    wrapper.append(input);
    expect(isPaletteShortcut(press({ target: input }))).toBe(false);
  });

  it("allows a press in an ordinary input", () => {
    expect(isPaletteShortcut(press({ target: document.createElement("input") }))).toBe(true);
  });
});
