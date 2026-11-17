import { useCallback, useEffect, useState } from "react";
import type { SlotEntry } from "../save-slots";
import { useCareer } from "../use-career";

/** The slot entries, read again whenever an autosave lands; `failed` when storage cannot be read. */
export function useSlotList() {
  const { listSlots, lastSavedAt } = useCareer();
  const [slots, setSlots] = useState<SlotEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    const result = await listSlots();
    if (result.ok) setSlots(result.slots);
    setFailed(!result.ok);
  }, [listSlots]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new autosave time refreshes the rows
  useEffect(() => {
    void refresh();
  }, [refresh, lastSavedAt]);

  return { slots, failed, refresh };
}
