import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { installBrowserStubs } from "./overlay-test-setup";
import { useMediaQuery } from "./use-media-query";

afterEach(cleanup);

function Probe() {
  return <p>{String(useMediaQuery("(max-width: 639.98px)"))}</p>;
}

describe("useMediaQuery", () => {
  it("reports a matching query", () => {
    installBrowserStubs({ phone: true });
    render(<Probe />);
    expect(screen.getByText("true")).toBeTruthy();
  });

  it("is false without matchMedia", () => {
    // @ts-expect-error simulate an environment without matchMedia
    window.matchMedia = undefined;
    render(<Probe />);
    expect(screen.getByText("false")).toBeTruthy();
  });
});
