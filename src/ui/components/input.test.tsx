import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Input } from "./input";

afterEach(cleanup);

describe("Input", () => {
  it("is named by its visible label", () => {
    render(<Input label="Club name" />);
    expect(screen.getByRole("textbox", { name: "Club name" })).toBeTruthy();
  });

  it("links the hint with aria-describedby", () => {
    render(<Input label="Seed" hint="Same seed, same league" />);
    expect(screen.getByRole("textbox", { description: "Same seed, same league" })).toBeTruthy();
  });

  it("links the error, marks the input invalid and lists the error before the hint", () => {
    render(<Input label="Seed" hint="A number" error="Not a number" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
    expect(screen.getByRole("textbox", { description: "Not a number A number" })).toBeTruthy();
  });

  it("is not marked invalid without an error", () => {
    render(<Input label="Seed" />);
    const input = screen.getByRole("textbox");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(input.hasAttribute("aria-describedby")).toBe(false);
  });

  it("uses an explicit id when given", () => {
    render(<Input label="Seed" id="seed-field" />);
    expect(screen.getByRole("textbox").id).toBe("seed-field");
  });

  it("is at least 44 px high", () => {
    render(<Input label="Seed" />);
    expect(screen.getByRole("textbox").className).toContain("min-h-11");
  });

  it("has a visible focus ring from the focus token", () => {
    render(<Input label="Seed" />);
    expect(screen.getByRole("textbox").className).toContain("focus-visible:outline-focus");
  });

  it("renders the search variant as a searchbox with a decorative icon", () => {
    render(<Input label="Search players" variant="search" />);
    const box = screen.getByRole("searchbox", { name: "Search players" });
    expect(box.parentElement?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });

  it("reports typing and passes ordinary attributes through", () => {
    const onChange = vi.fn();
    render(<Input label="Seed" placeholder="42" disabled={false} onChange={onChange} />);
    const input = screen.getByPlaceholderText("42");
    fireEvent.change(input, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", () => {
    render(<Input label="Seed" disabled />);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
  });
});
