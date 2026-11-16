import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SegmentedControl, type SegmentedOption } from "./segmented-control";

afterEach(cleanup);

const OPTIONS: SegmentedOption<string>[] = [
  { value: "x1", label: "x1" },
  { value: "x2", label: "x2" },
  { value: "x4", label: "x4" },
];

function Harness({
  options = OPTIONS,
  initial = "x1",
}: {
  options?: SegmentedOption<string>[];
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SegmentedControl label="Speed" options={options} value={value} onValueChange={setValue} />
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });

describe("SegmentedControl", () => {
  it("is a named radio group with the current value checked", () => {
    render(<Harness initial="x2" />);
    expect(screen.getByRole("radiogroup", { name: "Speed" })).toBeTruthy();
    expect(radio("x2").getAttribute("aria-checked")).toBe("true");
    expect(radio("x1").getAttribute("aria-checked")).toBe("false");
  });

  it("has a single tab stop on the selected option", () => {
    render(<Harness initial="x2" />);
    expect(radio("x2").tabIndex).toBe(0);
    expect(radio("x1").tabIndex).toBe(-1);
    expect(radio("x4").tabIndex).toBe(-1);
  });

  it("falls back to the first enabled option as tab stop when the value matches none", () => {
    render(
      <Harness
        initial="unknown"
        options={[
          { ...OPTIONS[0], disabled: true } as SegmentedOption<string>,
          ...OPTIONS.slice(1),
        ]}
      />,
    );
    expect(radio("x2").tabIndex).toBe(0);
  });

  it("selects an option on click", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl label="Speed" options={OPTIONS} value="x1" onValueChange={onValueChange} />,
    );
    fireEvent.click(radio("x4"));
    expect(onValueChange).toHaveBeenCalledWith("x4");
  });

  it("moves selection and focus with the arrow keys", () => {
    render(<Harness />);
    radio("x1").focus();
    fireEvent.keyDown(radio("x1"), { key: "ArrowRight" });
    expect(radio("x2").getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radio("x2"));
    fireEvent.keyDown(radio("x2"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(radio("x1"));
  });

  it("wraps around at the ends", () => {
    render(<Harness />);
    fireEvent.keyDown(radio("x1"), { key: "ArrowLeft" });
    expect(radio("x4").getAttribute("aria-checked")).toBe("true");
  });

  it("jumps with Home and End", () => {
    render(<Harness initial="x2" />);
    fireEvent.keyDown(radio("x2"), { key: "End" });
    expect(radio("x4").getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(radio("x4"), { key: "Home" });
    expect(radio("x1").getAttribute("aria-checked")).toBe("true");
  });

  it("skips disabled options and never selects them", () => {
    const options = [
      OPTIONS[0],
      { ...OPTIONS[1], disabled: true },
      OPTIONS[2],
    ] as SegmentedOption<string>[];
    render(<Harness options={options} />);
    fireEvent.keyDown(radio("x1"), { key: "ArrowRight" });
    expect(radio("x4").getAttribute("aria-checked")).toBe("true");
    expect((radio("x2") as HTMLButtonElement).disabled).toBe(true);
  });

  it("leaves other keys alone", () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl label="Speed" options={OPTIONS} value="x1" onValueChange={onValueChange} />,
    );
    fireEvent.keyDown(radio("x1"), { key: "a" });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("is at least 44 px high on touch and has a focus ring", () => {
    render(<Harness />);
    expect(radio("x1").className).toContain("pointer-coarse:min-h-11");
    expect(radio("x1").className).toContain("focus-visible:outline-focus");
  });
});
