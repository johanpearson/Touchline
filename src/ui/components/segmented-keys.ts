const NEXT_KEYS = ["ArrowRight", "ArrowDown"];
const PREVIOUS_KEYS = ["ArrowLeft", "ArrowUp"];

/** Index of the enabled option the key moves to, or -1 when the key does not move. */
export function targetIndex(key: string, from: number, enabled: readonly boolean[]): number {
  const count = enabled.length;
  const step = NEXT_KEYS.includes(key) ? 1 : PREVIOUS_KEYS.includes(key) ? -1 : 0;
  if (key === "Home") return enabled.indexOf(true);
  if (key === "End") return enabled.lastIndexOf(true);
  if (step === 0) return -1;
  for (let i = 1; i <= count; i++) {
    const candidate = (from + step * i + count * i) % count;
    if (enabled[candidate]) return candidate;
  }
  return -1;
}
