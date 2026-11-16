import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

afterEach(cleanup);

function Example({ disabledMiddle = false }: { disabledMiddle?: boolean }) {
  return (
    <Tabs defaultValue="stats">
      <TabsList aria-label="Match panel">
        <TabsTrigger value="stats">Stats</TabsTrigger>
        <TabsTrigger value="feed" disabled={disabledMiddle}>
          Feed
        </TabsTrigger>
        <TabsTrigger value="lineups">Lineups</TabsTrigger>
      </TabsList>
      <TabsContent value="stats">Stats panel</TabsContent>
      <TabsContent value="feed">Feed panel</TabsContent>
      <TabsContent value="lineups">Lineups panel</TabsContent>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });
const key = (name: string, k: string) => {
  tab(name).focus();
  fireEvent.keyDown(tab(name), { key: k });
};
// Radix moves focus in a timeout, so the focus assertions wait for it.
const expectFocus = (name: string) => waitFor(() => expect(document.activeElement).toBe(tab(name)));

describe("Tabs", () => {
  it("is a named tab list with the default panel shown", () => {
    render(<Example />);
    expect(screen.getByRole("tablist", { name: "Match panel" })).toBeTruthy();
    expect(tab("Stats").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Stats panel");
  });

  it("has a roving tabindex: once focus is inside, only the active tab is a tab stop", async () => {
    render(<Example />);
    tab("Stats").focus();
    await waitFor(() => expect(tab("Stats").tabIndex).toBe(0));
    expect(tab("Feed").tabIndex).toBe(-1);
    expect(tab("Lineups").tabIndex).toBe(-1);
  });

  it("moves focus with the arrow keys and wraps", async () => {
    render(<Example />);
    key("Stats", "ArrowRight");
    await expectFocus("Feed");
    key("Feed", "ArrowLeft");
    await expectFocus("Stats");
    key("Stats", "ArrowLeft");
    await expectFocus("Lineups");
  });

  it("jumps with Home and End", async () => {
    render(<Example />);
    key("Stats", "End");
    await expectFocus("Lineups");
    key("Lineups", "Home");
    await expectFocus("Stats");
  });

  it("skips a disabled tab", async () => {
    render(<Example disabledMiddle />);
    key("Stats", "ArrowRight");
    await expectFocus("Lineups");
  });

  it("shows the panel of the clicked tab", () => {
    render(<Example />);
    fireEvent.mouseDown(tab("Lineups"));
    fireEvent.click(tab("Lineups"));
    expect(screen.getByRole("tabpanel").textContent).toBe("Lineups panel");
  });

  it("is at least 44 px high and has a focus ring", () => {
    render(<Example />);
    expect(tab("Stats").className).toContain("min-h-11");
    expect(tab("Stats").className).toContain("focus-visible:outline-focus");
  });
});
