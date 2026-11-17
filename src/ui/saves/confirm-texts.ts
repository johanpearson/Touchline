import type { Translator } from "../../i18n";
import { slotLabel } from "./slot-label";

export type PendingAction = { id: string; action: "overwrite" | "delete" | "import" };

export type ConfirmTexts = {
  title: string;
  description: string;
  confirmLabel: string;
  /** Test id of the button that opened the dialog, where focus returns when it closes. */
  returnTestId: string;
};

/** The words of the confirmation for a pending overwrite, delete or import-overwrite. */
export function confirmTexts(pending: PendingAction, t: Translator["t"]): ConfirmTexts {
  const slot = slotLabel(pending.id, t);
  switch (pending.action) {
    case "delete":
      return {
        title: t("saves.confirmDeleteTitle", { slot }),
        description: t("saves.confirmDelete"),
        confirmLabel: t("saves.deleteAction"),
        returnTestId: `delete-${pending.id}`,
      };
    case "import":
      return {
        title: t("saves.confirmImportTitle", { slot }),
        description: t("saves.confirmImportOverwrite", { slot }),
        confirmLabel: t("saves.overwrite"),
        returnTestId: `import-into-${pending.id}`,
      };
    default:
      return {
        title: t("saves.confirmOverwriteTitle", { slot }),
        description: t("saves.confirmOverwrite"),
        confirmLabel: t("saves.overwrite"),
        returnTestId: `save-${pending.id}`,
      };
  }
}
