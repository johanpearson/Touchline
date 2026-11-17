import { Button, Card } from "../components";
import { useI18n } from "../i18n-provider";
import { isManualSlot, type SlotEntry } from "../save-slots";
import { useCareer } from "../use-career";
import { slotLabel } from "./slot-label";

type Props = {
  slots: SlotEntry[];
  busy: boolean;
  onChoose: (entry: SlotEntry) => void;
  onCancel: () => void;
};

/** After a valid file was picked: which manual slot should receive it. */
export function ImportPicker({ slots, busy, onChoose, onCancel }: Props) {
  const { t } = useI18n();
  const { importOffer } = useCareer();
  if (!importOffer) return null;
  return (
    <Card tone="raised" className="flex flex-col gap-3" data-testid="import-picker">
      <h2 className="m-0 font-heading text-2xl font-semibold">{t("saves.importPickerTitle")}</h2>
      <p className="m-0 text-soft">
        {t("saves.importPrompt", {
          club: importOffer.clubName,
          season: importOffer.season,
          matchday: importOffer.matchday,
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        {slots
          .filter((entry) => isManualSlot(entry.id))
          .map((entry) => (
            <Button
              key={entry.id}
              data-testid={`import-into-${entry.id}`}
              disabled={busy}
              onClick={() => onChoose(entry)}
            >
              {t("saves.importInto", { slot: slotLabel(entry.id, t) })}
            </Button>
          ))}
        <Button variant="ghost" data-testid="import-cancel" onClick={onCancel}>
          {t("saves.cancel")}
        </Button>
      </div>
    </Card>
  );
}
