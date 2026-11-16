import type { SortState } from "./components";

const KEY = "touchline.squad.sort";

/** The squad table's sort, remembered for the browser session (sessionStorage; null when unavailable). */
export function loadSquadSort(valid: ReadonlySet<string>): SortState | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { id, direction } = parsed as { id?: unknown; direction?: unknown };
    if (typeof id !== "string" || !valid.has(id)) return null;
    return direction === "asc" || direction === "desc" ? { id, direction } : null;
  } catch {
    return null;
  }
}

export function saveSquadSort(sort: SortState): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(sort));
  } catch {
    // Storage can be blocked; the sort then only lasts while the screen is open.
  }
}
