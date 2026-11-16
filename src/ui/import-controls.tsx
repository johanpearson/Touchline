import { Button, cn } from "./components";
import { useI18n } from "./i18n-provider";
import type { ImportError } from "./import-save";
import { useCareer } from "./use-career";

const ERROR_KEYS: Record<ImportError, string> = {
  "not-json": "saves.importError.notJson",
  "not-a-save": "saves.importError.notSave",
  "newer-version": "saves.importError.newerVersion",
  "file-too-large": "saves.importError.tooLarge",
  "corrupt-career": "saves.importError.corrupt",
};

type Props = {
  /** Called after a valid file was picked and is waiting for a target slot. */
  onPicked?: () => void;
  /** Text of the button. Defaults to "Import file". */
  label?: string;
  /** Extra classes for the button, for a screen that styles it differently. */
  buttonClassName?: string;
};

/** "Import file" button plus the reason the latest picked file was rejected. */
export function ImportControls({ onPicked, label, buttonClassName }: Props) {
  const { t } = useI18n();
  const { pickImport, importError } = useCareer();

  const pick = async () => {
    if ((await pickImport()) === "picked") onPicked?.();
  };

  return (
    <div className="import-controls flex flex-col gap-2">
      <Button data-testid="import-file" className={cn(buttonClassName)} onClick={() => void pick()}>
        {label ?? t("saves.import")}
      </Button>
      {importError ? (
        <p className="m-0 text-[13px] text-bad" role="alert" data-testid="import-error">
          {t(ERROR_KEYS[importError] as "saves.importError.notJson")}
        </p>
      ) : null}
    </div>
  );
}
