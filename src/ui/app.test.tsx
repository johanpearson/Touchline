import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryLocaleStore } from "../platform";
import { App } from "./app";

const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

describe("App", () => {
  afterEach(cleanup);

  it("renders the game title", () => {
    render(<App createRenderer={createRenderer} localeStore={createMemoryLocaleStore()} />);
    expect(screen.getByTestId("app-title").textContent).toBe("Touchline");
  });

  it("starts in English when nothing is saved", () => {
    render(<App createRenderer={createRenderer} localeStore={createMemoryLocaleStore()} />);
    expect(screen.getByText(/Language/)).toBeTruthy();
  });

  it("starts in the saved locale", () => {
    render(<App createRenderer={createRenderer} localeStore={createMemoryLocaleStore("sv")} />);
    expect(screen.getByText(/Språk/)).toBeTruthy();
  });

  it("ignores an unsupported saved locale", () => {
    render(<App createRenderer={createRenderer} localeStore={createMemoryLocaleStore("xx")} />);
    expect(screen.getByText(/Language/)).toBeTruthy();
  });

  it("shows the match screen", () => {
    render(<App createRenderer={createRenderer} localeStore={createMemoryLocaleStore()} />);
    expect(screen.getByTestId("match-screen")).toBeTruthy();
  });

  it("switches locale and remembers it in the store", () => {
    const store = createMemoryLocaleStore();
    render(<App createRenderer={createRenderer} localeStore={store} />);
    fireEvent.change(screen.getByTestId("locale-switch"), { target: { value: "sv" } });
    expect(screen.getByText(/Språk/)).toBeTruthy();
    expect(store.load()).toBe("sv");
  });
});
