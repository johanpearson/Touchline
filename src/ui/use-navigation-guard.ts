import { useEffect, useRef } from "react";
import { type NavigationGuard, registerNavigationGuard } from "./navigation-guard";

/**
 * Blocks every route change while `active` is true and calls `onBlocked` with the hash the user
 * asked for. The change is undone, so the screen stays; to go on, call `navigateUnguarded(hash)`.
 * Inactive guards, and unmounted ones, never block, so the user cannot be trapped.
 */
export function useNavigationGuard(active: boolean, onBlocked: NavigationGuard["onBlocked"]): void {
  const state = useRef({ active, onBlocked });
  state.current = { active, onBlocked };
  useEffect(
    () =>
      registerNavigationGuard({
        active: () => state.current.active,
        onBlocked: (hash) => state.current.onBlocked(hash),
      }),
    [],
  );
}
