import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePauseShortcut } from "./use-pause-shortcut";

function Probe({ onToggle, enabled = true }: { onToggle: () => void; enabled?: boolean }) {
  usePauseShortcut(enabled, onToggle);
  return (
    <div>
      <input aria-label="field" />
      <button type="button">button</button>
      <div role="img" aria-label="stage" />
    </div>
  );
}

describe("usePauseShortcut", () => {
  afterEach(cleanup);

  it("toggles on Space pressed on the page", () => {
    const onToggle = vi.fn();
    render(<Probe onToggle={onToggle} />);
    fireEvent.keyDown(document.body, { key: " " });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles on Space pressed on the stage image", () => {
    const onToggle = vi.fn();
    const { getByLabelText } = render(<Probe onToggle={onToggle} />);
    fireEvent.keyDown(getByLabelText("stage"), { key: " " });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("leaves Space to a focused input or button", () => {
    const onToggle = vi.fn();
    const { getByLabelText, getByText } = render(<Probe onToggle={onToggle} />);
    fireEvent.keyDown(getByLabelText("field"), { key: " " });
    fireEvent.keyDown(getByText("button"), { key: " " });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("does nothing while a dialog is open or when disabled", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<Probe onToggle={onToggle} enabled={false} />);
    fireEvent.keyDown(document.body, { key: " " });
    rerender(<Probe onToggle={onToggle} />);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    fireEvent.keyDown(document.body, { key: " " });
    dialog.remove();
    expect(onToggle).not.toHaveBeenCalled();
  });
});
