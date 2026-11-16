import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it.each([
    ["enabled", {}, 1],
    ["disabled", { disabled: true }, 0],
  ] as const)("click when %s fires onClick %i times", (_state, props, calls) => {
    const onClick = vi.fn();
    render(
      <Button {...props} onClick={onClick}>
        Play
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(onClick).toHaveBeenCalledTimes(calls);
  });

  it("does not fire onClick while loading and announces the loading label", () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingLabel="Saving" onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Save/ });
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Saving");
  });

  it("does not announce anything when not loading", () => {
    render(<Button loadingLabel="Saving">Save</Button>);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBeNull();
  });

  it("is type=button by default so it never submits a form by accident", () => {
    render(<Button>Play</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("uses the accent for primary and no club colour", () => {
    render(<Button variant="primary">Play</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("bg-accent");
    expect(cls).toContain("text-on-accent");
  });

  it.each([
    ["sm", "pointer-coarse:min-h-11"],
    ["md", "min-h-11"],
    ["lg", "min-h-12"],
  ] as const)("is at least 44 px tall at size %s (touch for sm)", (size, expected) => {
    render(<Button size={size}>Go</Button>);
    expect(screen.getByRole("button").className).toContain(expected);
  });

  it("has a visible focus ring from the focus token", () => {
    render(<Button>Play</Button>);
    expect(screen.getByRole("button").className).toContain("focus-visible:outline-focus");
  });

  it("renders a link with the button look and blocks it when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button asChild disabled onClick={onClick}>
        <a href="#/squad">Squad</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Squad" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets a later class override a variant class", () => {
    render(<Button className="px-8">Play</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("px-8");
    expect(cls).not.toContain("px-4");
  });
});
