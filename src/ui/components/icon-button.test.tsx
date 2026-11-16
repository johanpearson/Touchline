import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "./icon-button";

afterEach(cleanup);

describe("IconButton", () => {
  it("is named by its label and hides the icon from assistive technology", () => {
    render(<IconButton label="Add player" icon={<Plus />} />);
    const button = screen.getByRole("button", { name: "Add player" });
    expect(button.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(<IconButton label="Add" icon={<Plus />} disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<IconButton label="Add" icon={<Plus />} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is at least 44 x 44 px at md and lg, and on touch at sm", () => {
    render(
      <>
        <IconButton label="s" size="sm" icon={<Plus />} />
        <IconButton label="m" size="md" icon={<Plus />} />
        <IconButton label="l" size="lg" icon={<Plus />} />
      </>,
    );
    expect(screen.getByRole("button", { name: "s" }).className).toContain("pointer-coarse:size-11");
    expect(screen.getByRole("button", { name: "m" }).className).toContain("size-11");
    expect(screen.getByRole("button", { name: "l" }).className).toContain("size-12");
  });

  it("has a visible focus ring from the focus token", () => {
    render(<IconButton label="Add" icon={<Plus />} />);
    expect(screen.getByRole("button").className).toContain("focus-visible:outline-focus");
  });

  it("requires a label at compile time", () => {
    // @ts-expect-error an icon button without a label must not type-check
    const missing = <IconButton icon={<Plus />} />;
    expect(missing).toBeTruthy();
  });
});
