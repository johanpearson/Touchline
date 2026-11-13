import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryLocaleStore } from "../platform";
import { App } from "./app";

describe("App", () => {
  afterEach(cleanup);

  it("renders the game title", () => {
    render(<App localeStore={createMemoryLocaleStore()} />);
    expect(screen.getByTestId("app-title").textContent).toBe("Touchline");
  });

  it("starts in English when nothing is saved", () => {
    render(<App localeStore={createMemoryLocaleStore()} />);
    expect(screen.getByText(/Language/)).toBeTruthy();
  });

  it("starts in the saved locale", () => {
    render(<App localeStore={createMemoryLocaleStore("sv")} />);
    expect(screen.getByText(/Språk/)).toBeTruthy();
  });

  it("ignores an unsupported saved locale", () => {
    render(<App localeStore={createMemoryLocaleStore("xx")} />);
    expect(screen.getByText(/Language/)).toBeTruthy();
  });

  it("switches locale and remembers it in the store", () => {
    const store = createMemoryLocaleStore();
    render(<App localeStore={store} />);
    fireEvent.change(screen.getByTestId("locale-switch"), { target: { value: "sv" } });
    expect(screen.getByText(/Språk/)).toBeTruthy();
    expect(store.load()).toBe("sv");
  });
});
