import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KitIcon } from "./kit-icon";

describe("KitIcon", () => {
  afterEach(cleanup);

  it("paints the body and the trim of the kit", () => {
    const { container } = render(<KitIcon kit={{ body: "#aa0000", trim: "#eeeeee" }} />);
    const fills = [...container.querySelectorAll("[fill]")].map((el) => el.getAttribute("fill"));
    expect(fills).toContain("#aa0000");
    expect(fills).toContain("#eeeeee");
  });

  it("is decorative unless a label is given", () => {
    const { container } = render(<KitIcon kit={{ body: "#aa0000", trim: "#eeeeee" }} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
