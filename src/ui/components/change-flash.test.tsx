import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChangeFlash } from "./change-flash";

afterEach(cleanup);

describe("ChangeFlash", () => {
  it("marks the text as flashing after the value changes", () => {
    const { rerender } = render(<ChangeFlash value={1}>1</ChangeFlash>);
    expect(screen.getByText("1").getAttribute("data-flash")).toBeNull();
    rerender(<ChangeFlash value={2}>2</ChangeFlash>);
    expect(screen.getByText("2").getAttribute("data-flash")).toBe("true");
  });
});
