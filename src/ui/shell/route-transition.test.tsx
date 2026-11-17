import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installBrowserStubs } from "../components/overlay-test-setup";
import { RouteTransition } from "./route-transition";

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

beforeEach(() => {
  installBrowserStubs();
  window.location.hash = "#/league";
});
afterEach(cleanup);

describe("RouteTransition", () => {
  it("shows the page at rest on first load, without an entrance", () => {
    render(
      <RouteTransition>
        <p>Page</p>
      </RouteTransition>,
    );
    const wrapper = screen.getByTestId("route-transition");
    expect(screen.getByText("Page")).toBeTruthy();
    expect(wrapper.style.opacity).not.toBe("0");
    expect(wrapper.style.transform).toBe("none");
  });

  it("starts a new entrance when the route changes", () => {
    render(
      <RouteTransition>
        <p>Page</p>
      </RouteTransition>,
    );
    const before = screen.getByTestId("route-transition");
    goTo("#/squad");
    expect(screen.getByTestId("route-transition")).not.toBe(before);
  });

  it("keeps the content mounted with reduced motion and only fades", () => {
    installBrowserStubs({ reducedMotion: true });
    render(
      <RouteTransition>
        <p>Page</p>
      </RouteTransition>,
    );
    goTo("#/squad");
    expect(screen.getByTestId("route-transition").style.transform).not.toMatch(/translateY\(8px\)/);
  });
});
