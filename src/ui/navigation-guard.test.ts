import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRouteHash,
  navigateUnguarded,
  registerNavigationGuard,
  subscribeRoute,
} from "./navigation-guard";

// Undoing a blocked change traverses the history, which the browser (and jsdom) finish later.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const go = async (hash: string) => {
  window.location.hash = hash;
  await settle();
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
  describe("history", () => {
    // The app listens from the start, so every entry it shows is numbered before a guard blocks one.
    let unsubscribe = () => {};
    beforeEach(() => {
      unsubscribe = subscribeRoute(() => {});
    });
    afterEach(() => unsubscribe());

    const step = async (move: "back" | "forward") => {
      window.history[move]();
      await settle();
    };

    it("leaves the entries as they were after a blocked push, so one Back press leaves the match", async () => {
      await go("#/home");
      await go("#/match");
      let active = true;
      const unregister = registerNavigationGuard({ active: () => active, onBlocked: vi.fn() });
      await go("#/league");
      await settle();
      expect(window.location.hash).toBe("#/match");
      active = false;
      await step("back");
      expect(window.location.hash).toBe("#/home");
      unregister();
    });

    it("returns the cursor to the match entry after a blocked Back, without a duplicate entry", async () => {
      await go("#/home");
      await go("#/match");
      let active = true;
      const onBlocked = vi.fn();
      const unregister = registerNavigationGuard({ active: () => active, onBlocked });
      await step("back");
      expect(onBlocked).toHaveBeenCalledWith("#/home");
      expect(window.location.hash).toBe("#/match");
      active = false;
      await step("back");
      expect(window.location.hash).toBe("#/home");
      unregister();
    });

    it("returns the cursor to the match entry after a blocked Forward", async () => {
      await go("#/match");
      await go("#/league");
      await step("back");
      let active = true;
      const onBlocked = vi.fn();
      const unregister = registerNavigationGuard({ active: () => active, onBlocked });
      await step("forward");
      expect(onBlocked).toHaveBeenCalledWith("#/league");
      expect(window.location.hash).toBe("#/match");
      active = false;
      await step("forward");
      expect(window.location.hash).toBe("#/league");
      unregister();
    });
  });
});
