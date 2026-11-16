import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { installBrowserStubs } from "./overlay-test-setup";
import { type ToastInput, ToastProvider, useToast } from "./toast";

beforeEach(() => installBrowserStubs());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Trigger(props: { input: ToastInput }) {
  const { toast } = useToast();
  return <Button onClick={() => toast(props.input)}>Fire</Button>;
}

const setup = (input: ToastInput) => {
  render(
    <ToastProvider dismissLabel="Dismiss" viewportLabel="Notifications (F8)">
      <Trigger input={input} />
    </ToastProvider>,
  );
  const fire = screen.getByText("Fire");
  fire.focus();
  fireEvent.click(fire);
  return fire;
};

describe("Toast", () => {
  it("announces politely without stealing focus", async () => {
    const fire = setup({ title: "Saved", tone: "success" });
    expect((await screen.findAllByRole("status")).length).toBeGreaterThan(0);
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(document.activeElement).toBe(fire);
  });

  it("is reachable by keyboard with the F8 hotkey", async () => {
    setup({ title: "Saved" });
    await screen.findByText("Saved");
    fireEvent.keyDown(document, { key: "F8", code: "F8" });
    expect(screen.getByRole("region", { name: "Notifications (F8)" })).toBeTruthy();
  });

  it("dismisses with the dismiss button", async () => {
    setup({ title: "Saved" });
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByText("Saved")).toBeNull());
  });

  it("closes a success toast by itself", async () => {
    vi.useFakeTimers();
    setup({ title: "Saved", tone: "success" });
    expect(screen.getByText("Saved")).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("keeps an error toast until it is dismissed", async () => {
    vi.useFakeTimers();
    setup({ title: "Save failed", tone: "error" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByText("Save failed")).toBeTruthy();
  });

  it("throws when useToast is used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger input={{ title: "x" }} />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
