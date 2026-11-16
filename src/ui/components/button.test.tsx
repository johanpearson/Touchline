import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Play</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Play
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(onClick).not.toHaveBeenCalled();
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

  it("is at least 44 px tall at md and lg, and on touch at sm", () => {
    render(
      <>
        <Button size="sm">S</Button>
        <Button size="md">M</Button>
        <Button size="lg">L</Button>
      </>,
    );
    expect(screen.getByText("S").className).toContain("pointer-coarse:min-h-11");
    expect(screen.getByText("M").className).toContain("min-h-11");
    expect(screen.getByText("L").className).toContain("min-h-12");
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
