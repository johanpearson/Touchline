import { TriangleAlert } from "lucide-react";
import { useI18n } from "./i18n-provider";

/** Persistent banner shown when the app fell back to the in-memory save store. */
export function StorageWarning() {
  const { t } = useI18n();
  return (
    <p
      className="mb-4 flex items-center gap-3 rounded-lg border border-warn bg-surface px-4 py-3 text-[15px] text-text"
      role="alert"
      data-testid="storage-warning"
    >
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-warn" />
      {t("save.storageWarning")}
    </p>
  );
}
