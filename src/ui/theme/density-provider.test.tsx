import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryDensityStore } from "../../platform";
import { DensityProvider, useDensity } from "./density-provider";

afterEach(cleanup);

function Probe() {
  const { density, setDensity } = useDensity();
  return (
    <button type="button" onClick={() => setDensity("comfortable")}>
      {density}
    </button>
  );
}

describe("DensityProvider", () => {
  it("defaults to compact", () => {
    render(
      <DensityProvider store={createMemoryDensityStore()}>
        <Probe />
      </DensityProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("compact");
  });

  it("uses the saved density and ignores an unknown value", () => {
    const { unmount } = render(
      <DensityProvider store={createMemoryDensityStore("comfortable")}>
        <Probe />
      </DensityProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("comfortable");
    unmount();
    render(
      <DensityProvider store={createMemoryDensityStore("huge")}>
        <Probe />
      </DensityProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("compact");
  });

  it("remembers a change in the store", () => {
    const store = createMemoryDensityStore();
    render(
      <DensityProvider store={store}>
        <Probe />
      </DensityProvider>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("comfortable");
    expect(store.load()).toBe("comfortable");
  });

  it("throws outside a provider", () => {
    expect(() => render(<Probe />)).toThrow(/DensityProvider/);
  });
});
