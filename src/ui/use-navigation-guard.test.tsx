import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateUnguarded } from "./navigation-guard";
import { useNavigationGuard } from "./use-navigation-guard";
import { useRoute } from "./use-route";

const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));

function Probe({ active, onBlocked }: { active: boolean; onBlocked: (hash: string) => void }) {
  useNavigationGuard(active, onBlocked);
  return <p data-testid="route">{useRoute().name}</p>;
}

const startAt = async (hash: string) => {
  window.location.hash = hash;
  await settle();
};

const route = (view: ReturnType<typeof render>) => view.getByTestId("route").textContent;

afterEach(async () => {
  cleanup();
  window.location.hash = "";
  await settle();
});

describe("useNavigationGuard", () => {
  it("keeps the route and reports the hash the user asked for", async () => {
    await startAt("#/match");
    const onBlocked = vi.fn();
    const view = render(<Probe active onBlocked={onBlocked} />);
    await settle();
    window.location.hash = "#/league";
    await settle();
    expect(onBlocked).toHaveBeenCalledWith("#/league");
    expect(route(view)).toBe("match");
    expect(window.location.hash).toBe("#/match");
  });

  it("lets the user through once it turns inactive", async () => {
    await startAt("#/match");
    const onBlocked = vi.fn();
    const view = render(<Probe active onBlocked={onBlocked} />);
    view.rerender(<Probe active={false} onBlocked={onBlocked} />);
    window.location.hash = "#/league";
    await settle();
    expect(onBlocked).not.toHaveBeenCalled();
    expect(route(view)).toBe("league");
  });

  it("goes on to the blocked target after a confirmation", async () => {
    await startAt("#/match");
    const onBlocked = vi.fn();
    const view = render(<Probe active onBlocked={onBlocked} />);
    window.location.hash = "#/league";
    await settle();
    act(() => navigateUnguarded("#/league"));
    await settle();
    expect(route(view)).toBe("league");
  });

  it("stops blocking when the screen unmounts", async () => {
    await startAt("#/match");
    const onBlocked = vi.fn();
    render(<Probe active onBlocked={onBlocked} />).unmount();
    window.location.hash = "#/league";
    await settle();
    expect(onBlocked).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/league");
  });
});
