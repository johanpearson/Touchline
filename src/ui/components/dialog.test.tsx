import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog } from "./dialog";
import { installBrowserStubs } from "./overlay-test-setup";

beforeEach(() => installBrowserStubs());
afterEach(cleanup);

const outsideClick = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5));
  });
  const overlay = document.querySelector("[data-state='open'][class*='fixed']");
  if (!overlay) throw new Error("overlay missing");
  fireEvent.pointerDown(overlay);
  fireEvent.click(overlay);
};

function Harness(props: { destructive?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Open</Button>}
      title="Delete save"
      description="This cannot be undone."
      closeLabel="Close"
      destructive={props.destructive}
      actions={<Button>Go</Button>}
    >
      <input aria-label="Name" />
    </Dialog>
  );
}

describe("Dialog", () => {
  it("is a named dialog with a description", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    const dialog = screen.getByRole("dialog", { name: "Delete save" });
    expect(dialog).toHaveProperty("textContent", expect.stringContaining("This cannot be undone."));
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("moves focus into the dialog and returns it to the trigger on Escape", async () => {
    render(<Harness />);
    const trigger = screen.getByText("Open");
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on an outside click", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    await outsideClick();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps a destructive dialog open on an outside click and hides the close button", async () => {
    render(<Harness destructive />);
    fireEvent.click(screen.getByText("Open"));
    await outsideClick();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("still closes a destructive dialog on Escape", async () => {
    render(<Harness destructive />);
    fireEvent.click(screen.getByText("Open"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("locks background scroll while open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    expect(document.body.getAttribute("data-scroll-locked")).not.toBeNull();
  });

  it("has a close button of at least 44 px", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    expect(screen.getByRole("button", { name: "Close" }).className).toContain("size-11");
  });
});

describe("ConfirmDialog", () => {
  it("confirms and cancels", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete?"
        confirmLabel="Yes, delete"
        cancelLabel="Keep"
        closeLabel="Close"
        onConfirm={onConfirm}
        destructive
        confirmTestId="confirm-yes"
      />,
    );
    fireEvent.click(screen.getByTestId("confirm-yes"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Keep"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables the confirm button while busy", () => {
    render(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Yes"
        cancelLabel="No"
        closeLabel="Close"
        onConfirm={() => {}}
        busy
      />,
    );
    expect(screen.getByText("Yes").hasAttribute("disabled")).toBe(true);
  });
});
