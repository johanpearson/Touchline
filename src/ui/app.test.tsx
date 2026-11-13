import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app";

describe("App", () => {
  it("renders the game title", () => {
    render(<App />);
    expect(screen.getByTestId("app-title").textContent).toBe("Touchline");
  });
});
