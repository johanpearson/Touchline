import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRouteHash,
  navigateUnguarded,
  registerNavigationGuard,
  subscribeRoute,
} from "./navigation-guard";

const go = async (hash: string) => {
  window.location.hash = hash;
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe("navigation guard", () => {
  beforeEach(async () => {
    await go("#/match");
  });
  afterEach(async () => {
    await go("");
  });

  it("lets a route change through while no guard is active", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRoute(listener);
    await go("#/league");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getRouteHash()).toBe("#/league");
    unsubscribe();
  });

  it("blocks a route change while a guard is active, restores the hash and reports the target", async () => {
    const listener = vi.fn();
    const onBlocked = vi.fn();
    const unsubscribe = subscribeRoute(listener);
    const unregister = registerNavigationGuard({ active: () => true, onBlocked });
    await go("#/league");
    expect(onBlocked).toHaveBeenCalledWith("#/league");
    expect(window.location.hash).toBe("#/match");
    expect(getRouteHash()).toBe("#/match");
    expect(listener).not.toHaveBeenCalled();
    unregister();
    unsubscribe();
  });

  it("is inactive when the guard says so, for instance after full time", async () => {
    let active = true;
    const onBlocked = vi.fn();
    const unregister = registerNavigationGuard({ active: () => active, onBlocked });
    active = false;
    await go("#/league");
    expect(onBlocked).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/league");
    unregister();
  });

  it("stops guarding once the guard is unregistered", async () => {
    const onBlocked = vi.fn();
    registerNavigationGuard({ active: () => true, onBlocked })();
    await go("#/league");
    expect(onBlocked).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#/league");
  });

  it("proceeds to a blocked target on request, without asking again", async () => {
    const listener = vi.fn();
    const onBlocked = vi.fn();
    const unsubscribe = subscribeRoute(listener);
    const unregister = registerNavigationGuard({ active: () => true, onBlocked });
    navigateUnguarded("#/league");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onBlocked).not.toHaveBeenCalled();
    expect(getRouteHash()).toBe("#/league");
    expect(listener).toHaveBeenCalledTimes(1);
    unregister();
    unsubscribe();
  });

  it("guards again after an unguarded navigation", async () => {
    const onBlocked = vi.fn();
    const unregister = registerNavigationGuard({ active: () => true, onBlocked });
    navigateUnguarded("#/league");
    await new Promise((resolve) => setTimeout(resolve, 0));
    await go("#/squad");
    expect(onBlocked).toHaveBeenCalledWith("#/squad");
    unregister();
  });
});
