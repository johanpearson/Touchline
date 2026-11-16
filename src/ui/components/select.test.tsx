import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Select, type SelectOption } from "./select";

beforeAll(() => {
  // jsdom lacks the pointer and scroll APIs Radix Select uses.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

const OPTIONS: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "sv", label: "Svenska" },
  { value: "de", label: "Deutsch", disabled: true },
  { value: "long", label: "Fortsätt till nästa omgång och förbered laguppställningen" },
];

const trigger = () => screen.getByRole("combobox");
const open = () => {
  trigger().focus();
  fireEvent.keyDown(trigger(), { key: "ArrowDown" });
};

describe("Select", () => {
  it("is named by its label and shows the placeholder", () => {
    render(<Select label="Language" options={OPTIONS} placeholder="Choose" />);
    expect(screen.getByRole("combobox", { name: "Language" })).toBeTruthy();
    expect(trigger().textContent).toContain("Choose");
  });

  it("shows the label of the selected value", () => {
    render(<Select label="Language" options={OPTIONS} defaultValue="sv" />);
    expect(trigger().textContent).toContain("Svenska");
  });

  it("opens with the arrow key and lists the options", () => {
    render(<Select label="Language" options={OPTIONS} />);
    open();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("moves with the arrow keys and selects with Enter", () => {
    const onValueChange = vi.fn();
    render(
      <Select label="Language" options={OPTIONS} defaultValue="en" onValueChange={onValueChange} />,
    );
    open();
    const selected = screen.getByRole("option", { name: "English" });
    fireEvent.keyDown(selected, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("option", { name: "Svenska" }), { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledWith("sv");
  });

  it("jumps to the last option with End", async () => {
    const onValueChange = vi.fn();
    render(
      <Select label="Language" options={OPTIONS} defaultValue="sv" onValueChange={onValueChange} />,
    );
    open();
    fireEvent.keyDown(screen.getByRole("option", { name: "Svenska" }), { key: "End" });
    await waitFor(() => expect(document.activeElement?.textContent).toContain("Fortsätt"));
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith("long");
  });

  it("marks disabled options", () => {
    render(<Select label="Language" options={OPTIONS} />);
    open();
    expect(screen.getByRole("option", { name: "Deutsch" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("keeps the full text of a long option as its title", () => {
    render(<Select label="Language" options={OPTIONS} />);
    open();
    expect(screen.getByTitle(OPTIONS[3]?.label ?? "")).toBeTruthy();
  });

  it("links hint and error to the trigger", () => {
    render(
      <Select label="Language" options={OPTIONS} hint="Saved with the career" error="Pick one" />,
    );
    expect(trigger().getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByRole("combobox", { description: "Pick one Saved with the career" }),
    ).toBeTruthy();
  });

  it("can be disabled", () => {
    render(<Select label="Language" options={OPTIONS} disabled />);
    expect((trigger() as HTMLButtonElement).disabled).toBe(true);
  });

  it("is at least 44 px high and has a focus ring", () => {
    render(<Select label="Language" options={OPTIONS} />);
    expect(trigger().className).toContain("min-h-11");
    expect(trigger().className).toContain("focus-visible:outline-focus");
  });
});
