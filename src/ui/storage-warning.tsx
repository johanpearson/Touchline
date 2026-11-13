import { useI18n } from "./i18n-provider";

/** Persistent banner shown when the app fell back to the in-memory save store. */
export function StorageWarning() {
  const { t } = useI18n();
  return (
    <p className="storage-warning" role="alert" data-testid="storage-warning">
      {t("save.storageWarning")}
    </p>
  );
}
