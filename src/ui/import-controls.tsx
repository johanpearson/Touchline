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
};

/** "Import file" button plus the reason the latest picked file was rejected. */
export function ImportControls({ onPicked }: Props) {
  const { t } = useI18n();
  const { pickImport, importError } = useCareer();

  const pick = async () => {
    if ((await pickImport()) === "picked") onPicked?.();
  };

  return (
    <div className="import-controls">
      <button type="button" data-testid="import-file" onClick={() => void pick()}>
        {t("saves.import")}
      </button>
      {importError ? (
        <p className="import-error" role="alert" data-testid="import-error">
          {t(ERROR_KEYS[importError] as "saves.importError.notJson")}
        </p>
      ) : null}
    </div>
  );
}
