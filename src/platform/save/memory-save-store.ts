import type { SaveEnvelope, SaveStore } from "../../shared";

/** In-memory `SaveStore` for tests. Data is copied in and out so callers cannot mutate stored saves. */
export function createMemorySaveStore(): SaveStore {
  const saves = new Map<string, SaveEnvelope>();
  return {
    list: async () => [...saves.keys()].sort(),
    load: async (id) => {
      const found = saves.get(id);
      return found === undefined ? null : structuredClone(found);
    },
    save: async (id, data) => {
      saves.set(id, structuredClone(data));
    },
    delete: async (id) => {
      saves.delete(id);
    },
  };
}
