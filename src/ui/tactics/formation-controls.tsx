import { FORMATIONS, type Formation } from "../../game";
import { Button, SegmentedControl } from "../components";
import { useI18n } from "../i18n-provider";

export type FormationControlsProps = {
  formation: Formation;
  onPick: (formation: Formation) => void;
};

/** The six formations as a segmented control; the squad screen and the changes sheet share it. */
export function FormationPicker({ formation, onPick }: FormationControlsProps) {
  const { t } = useI18n();
  return (
    <div data-testid="formation" data-value={formation}>
      <SegmentedControl
        label={t("squad.formation")}
        value={formation}
        options={FORMATIONS.map((f) => ({ value: f, label: f }))}
        onValueChange={onPick}
        className="grid w-full grid-cols-3 sm:grid-cols-6"
      />
    </div>
  );
}

/** The six formations and Auto-pick; choosing a formation picks the best eleven for it. */
export function FormationControls({ formation, onPick }: FormationControlsProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <FormationPicker formation={formation} onPick={onPick} />
      <div>
        <Button variant="secondary" data-testid="auto-pick" onClick={() => onPick(formation)}>
          {t("squad.autoPick")}
        </Button>
      </div>
    </div>
  );
}
