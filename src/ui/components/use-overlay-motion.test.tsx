import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { installBrowserStubs } from "./overlay-test-setup";
import { type MotionProps, useOverlayMotion } from "./use-overlay-motion";

afterEach(cleanup);

let captured: MotionProps | undefined;

function Probe() {
  captured = useOverlayMotion({ y: "100%" });
  return null;
}

function capture(options: { reducedMotion: boolean }): MotionProps {
  installBrowserStubs(options);
  render(<Probe />);
  if (!captured) throw new Error("no result");
  return captured;
}

describe("useOverlayMotion", () => {
  it("moves and scales in normally", () => {
    const m = capture({ reducedMotion: false });
    expect(m.initial).toMatchObject({ opacity: 0, y: "100%" });
  });

  it("only fades with prefers-reduced-motion: reduce", () => {
    const m = capture({ reducedMotion: true });
    expect(m.initial).toEqual({ opacity: 0 });
    expect(m.animate).toEqual({ opacity: 1 });
  });
});
