import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { cellPadding } from "../components";
import { DensityPreview } from "./density-preview";

afterEach(cleanup);

const firstBodyCell = () => screen.getByText("Lindqvist");

describe("density preview", () => {
  it("is decorative", () => {
    render(<DensityPreview density="compact" />);
    expect(screen.getByTestId("density-preview").getAttribute("aria-hidden")).toBe("true");
  });

  it("draws a header and four rows", () => {
    render(<DensityPreview density="compact" />);
    expect(document.querySelectorAll("thead tr")).toHaveLength(1);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
  });

  it.each(["compact", "comfortable"] as const)("uses the table's %s row padding", (density) => {
    render(<DensityPreview density={density} />);
    for (const token of cellPadding(density).split(" ")) {
      expect(firstBodyCell().classList.contains(token)).toBe(true);
    }
  });

  it("eases the padding and turns the animation off with reduced motion", () => {
    render(<DensityPreview density="compact" />);
    const cell = firstBodyCell();
    expect(cell.classList.contains("transition-[padding]")).toBe(true);
    expect(cell.classList.contains("motion-reduce:transition-none")).toBe(true);
    expect(cell.style.transitionDuration).toBe("200ms");
  });
});
