import { useI18n } from "../i18n-provider";
import { isManualSlot, type SlotEntry } from "../save-slots";
import { useCareer } from "../use-career";
import { slotLabel } from "./slot-label";
import { SlotRow } from "./slot-row";
import type { SlotActions } from "./use-slot-actions";

type Props = { slots: SlotEntry[]; actions: SlotActions };

/** The slot cards in order: autosave first, then the manual slots. */
export function SlotList({ slots, actions }: Props) {
  const { t } = useI18n();
  const { career, lastImportedSlot } = useCareer();
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {slots.map((entry) => (
        <SlotRow
          key={entry.id}
          entry={entry}
          name={slotLabel(entry.id, t)}
          canSave={career !== null && isManualSlot(entry.id)}
          busy={actions.busy}
          highlighted={lastImportedSlot === entry.id}
          error={actions.error?.id === entry.id ? actions.error.error : null}
          onSave={() => void actions.save(entry)}
          onLoad={() => void actions.load(entry)}
          onExport={() => void actions.exportSlot(entry)}
          onDelete={() => actions.askDelete(entry)}
        />
      ))}
    </ul>
  );
}
