import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClubCrest } from "./club-crest";

const colours = { primary: "#123456", secondary: "#f2e94e" };

describe("ClubCrest", () => {
  afterEach(cleanup);

  it("shows the short name as initials", () => {
    render(<ClubCrest shortName="KVA" colours={colours} />);
    expect(screen.getByText("KVA")).toBeTruthy();
  });

  it("paints the shield with the club colours", () => {
    const { container } = render(<ClubCrest shortName="KVA" colours={colours} />);
    const fills = [...container.querySelectorAll("[fill]")].map((el) => el.getAttribute("fill"));
    expect(fills).toContain(colours.primary);
    expect(fills).toContain(colours.secondary);
  });

  it("is hidden from assistive technology unless a label is given", () => {
    const { container } = render(<ClubCrest shortName="KVA" colours={colours} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is named when a label is given", () => {
    render(<ClubCrest shortName="KVA" colours={colours} label="Kvarnby FK" />);
    expect(screen.getByRole("img", { name: "Kvarnby FK" })).toBeTruthy();
  });
});
