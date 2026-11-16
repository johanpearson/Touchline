import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScrollArea } from "./scroll-area";

afterEach(cleanup);

describe("ScrollArea", () => {
  it("is a labelled, focusable region", () => {
    render(
      <ScrollArea label="Clubs">
        <button type="button">A</button>
      </ScrollArea>,
    );
    const region = screen.getByRole("region", { name: "Clubs" });
    expect(region.tabIndex).toBe(0);
  });

  it("hides the scrollbar when horizontal (the default)", () => {
    render(<ScrollArea label="Clubs" />);
    const { className } = screen.getByRole("region");
    expect(className).toContain("scroll-hidden");
    expect(className).toContain("overflow-x-auto");
  });

  it("uses the thin themed scrollbar when vertical", () => {
    render(<ScrollArea label="Log" orientation="vertical" />);
    const { className } = screen.getByRole("region");
    expect(className).toContain("scroll-thin");
    expect(className).toContain("overflow-y-auto");
    expect(className).not.toContain("scroll-hidden");
  });

  it("adds the edge fade and snap only when asked", () => {
    const { rerender } = render(<ScrollArea label="Clubs" />);
    expect(screen.getByRole("region").className).not.toContain("scroll-fade");
    expect(screen.getByRole("region").className).not.toContain("snap-x");
    rerender(<ScrollArea label="Clubs" fade snap />);
    expect(screen.getByRole("region").className).toContain("scroll-fade");
    expect(screen.getByRole("region").className).toContain("snap-x");
  });

  it("turns smooth scrolling and snapping off under reduced motion", () => {
    render(<ScrollArea label="Clubs" snap />);
    const { className } = screen.getByRole("region");
    expect(className).toContain("motion-reduce:scroll-auto");
    expect(className).toContain("motion-reduce:snap-none");
  });

  it("scrolls a focused child into view", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <ScrollArea label="Clubs">
        <button type="button">Far away</button>
      </ScrollArea>,
    );
    fireEvent.focus(screen.getByRole("button"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  });

  it("does not scroll when the area itself is focused, and still calls onFocus", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const onFocus = vi.fn();
    render(<ScrollArea label="Clubs" onFocus={onFocus} />);
    fireEvent.focus(screen.getByRole("region"));
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
