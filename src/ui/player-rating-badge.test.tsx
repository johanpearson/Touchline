import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryLocaleStore } from "../platform";
import { I18nProvider } from "./i18n-provider";
import { PlayerRatingBadge } from "./player-rating-badge";

const renderBadge = (props: Partial<Parameters<typeof PlayerRatingBadge>[0]> = {}, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <PlayerRatingBadge rating={14.26} fitness={88} {...props} />
    </I18nProvider>,
  );

describe("PlayerRatingBadge", () => {
  afterEach(cleanup);

  it("shows the rating with one decimal as the primary figure", () => {
    renderBadge();
    expect(screen.getByTestId("rating-value").textContent).toMatch(/14\.3$/);
  });

  it("gives screen readers labels for the rating and the fitness", () => {
    renderBadge();
    expect(screen.getByTestId("rating-badge").textContent).toMatch(/Rating\s*14\.3/);
    expect(screen.getByTestId("rating-badge").textContent).toMatch(/Fitness\s*88/);
  });

  it("shows fitness as a secondary figure with a thin bar that is decorative", () => {
    renderBadge();
    expect(screen.getByTestId("fitness-value").textContent).toBe("88");
    const bar = screen.getByTestId("fitness-bar");
    expect(bar.getAttribute("aria-hidden")).toBe("true");
    expect(bar.firstElementChild?.getAttribute("style")).toContain("width: 88%");
  });

  it("makes the rating larger and bolder than the fitness figure", () => {
    renderBadge();
    expect(screen.getByTestId("rating-value").className).toContain("font-semibold");
    expect(screen.getByTestId("fitness-value").className).toContain("text-xs");
  });

  it("marks low fitness with a warning shape and text, not colour alone", () => {
    renderBadge({ fitness: 42 });
    const badge = screen.getByTestId("rating-badge");
    expect(badge.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
    expect(badge.textContent).toContain("Low fitness");
    expect(screen.getByTestId("fitness-value").textContent).toBe("42");
  });

  it("shows no warning at comfortable fitness", () => {
    renderBadge({ fitness: 50 });
    expect(
      screen.getByTestId("rating-badge").querySelector("svg.lucide-triangle-alert"),
    ).toBeNull();
    expect(screen.getByTestId("rating-badge").textContent).not.toContain("Low fitness");
  });

  it("keeps the low fitness text for screen readers only in the compact layout", () => {
    renderBadge({ fitness: 42, layout: "compact" });
    expect(screen.getByText("Low fitness").className).toContain("sr-only");
  });

  it("shows the low fitness text in the inline layout", () => {
    renderBadge({ fitness: 42, layout: "inline" });
    expect(screen.getByText("Low fitness").className).not.toContain("sr-only");
  });

  it("uses Swedish labels and a decimal comma", () => {
    renderBadge({ fitness: 30 }, "sv");
    const badge = screen.getByTestId("rating-badge");
    expect(badge.textContent).toContain("Betyg");
    expect(badge.textContent).toContain("14,3");
    expect(badge.textContent).toContain("Låg kondition");
  });

  it("clamps the bar to the 0 to 100 range", () => {
    renderBadge({ fitness: 140 });
    expect(screen.getByTestId("fitness-bar").firstElementChild?.getAttribute("style")).toContain(
      "width: 100%",
    );
  });
});
