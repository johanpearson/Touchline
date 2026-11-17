import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Button } from "./button";
import { installBrowserStubs } from "./overlay-test-setup";
import { Tooltip } from "./tooltip";

beforeEach(() => installBrowserStubs());
afterEach(cleanup);

const setup = () => {
  render(
    <Tooltip content="Open the menu" delayDuration={0}>
      <Button>Menu</Button>
    </Tooltip>,
  );
  return screen.getByRole("button", { name: "Menu" });
};

describe("Tooltip", () => {
  it("opens on hover with a tooltip role linked to the trigger", async () => {
    const trigger = setup();
    fireEvent.pointerMove(trigger, { pointerType: "mouse" });
    const tip = await screen.findByRole("tooltip");
    expect(tip.textContent).toBe("Open the menu");
    expect(trigger.getAttribute("aria-describedby")).toBe(tip.id);
  });

  it("opens on keyboard focus", async () => {
    const trigger = setup();
    fireEvent.focus(trigger);
    expect(await screen.findByRole("tooltip")).toBeTruthy();
  });

  it("closes on Escape", async () => {
    const trigger = setup();
    fireEvent.focus(trigger);
    await screen.findByRole("tooltip");
    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });
});
