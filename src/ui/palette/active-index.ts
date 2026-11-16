export type NavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export const isNavigationKey = (key: string): key is NavigationKey =>
  key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End";

/** The highlighted result after a key press; `count` results, `current` -1 for none. */
export function nextActiveIndex(current: number, count: number, key: NavigationKey): number {
  if (count === 0) return -1;
  switch (key) {
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return current <= 0 ? count - 1 : current - 1;
  }
}
