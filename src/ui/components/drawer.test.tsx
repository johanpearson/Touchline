import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Button } from "./button";
import { Drawer } from "./drawer";
import { installBrowserStubs } from "./overlay-test-setup";

beforeEach(() => installBrowserStubs());
afterEach(cleanup);

const open = (side?: "left" | "right") => {
  render(
    <Drawer trigger={<Button>More</Button>} title="More" closeLabel="Close" side={side}>
      <p>Settings</p>
    </Drawer>,
  );
  const trigger = screen.getByText("More");
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
};

describe("Drawer", () => {
  it("is a bottom sheet below 640 px and a side sheet above", () => {
    open();
    const cls = screen.getByRole("dialog").className;
    expect(cls).toContain("max-sm:inset-x-0");
    expect(cls).toContain("max-sm:bottom-0");
    expect(cls).toContain("sm:inset-y-0");
    expect(cls).toContain("sm:right-0");
  });

  it("can open from the left on wider screens", () => {
    open("left");
    expect(screen.getByRole("dialog").className).toContain("sm:left-0");
  });

  it("returns focus to the trigger on Escape", async () => {
    const trigger = open();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("locks background scroll and has a 44 px close button", () => {
    open();
    expect(document.body.getAttribute("data-scroll-locked")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Close" }).className).toContain("size-11");
  });

  it("slides in from the bottom on phones", () => {
    cleanup();
    installBrowserStubs({ phone: true });
    open();
    expect(screen.getByRole("dialog").style.transform).toContain("translateY(100%)");
  });
});
