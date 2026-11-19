import { useMemo, useRef } from "react";
import { type ActionEvent, createZoneEventAdapter, type ZoneEvent } from "../../engine";

type Adapted = {
  adapter: ReturnType<typeof createZoneEventAdapter>;
  consumed: number;
  zone: ZoneEvent[];
};

/**
 * The terrain, the momentum chart and the stats only ever see the adapted events. `events` is
 * appended to in place; `eventCount` tells when it grew, so only the new tail is adapted and
 * appended to one growing zone-event list.
 */
export const useZoneEvents = (events: readonly ActionEvent[], eventCount: number): ZoneEvent[] => {
  const adapted = useRef<Adapted | undefined>(undefined);
  adapted.current ??= { adapter: createZoneEventAdapter(), consumed: 0, zone: [] };
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` is appended to in place; `eventCount` is the signal
  return useMemo(() => {
    const kept = adapted.current;
    if (!kept) return [];
    kept.zone.push(...kept.adapter.push(events.slice(kept.consumed, eventCount)));
    kept.consumed = eventCount;
    // A cheap copy of references, so memoised children see a new array when the log grew.
    return kept.zone.slice();
  }, [eventCount]);
};
