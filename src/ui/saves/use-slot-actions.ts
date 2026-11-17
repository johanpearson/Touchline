import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";
import type { SlotActionResult, SlotEntry } from "../save-slots";
import { useCareer } from "../use-career";
import { confirmTexts, type PendingAction } from "./confirm-texts";
import { slotLabel } from "./slot-label";
import { useSlotRunner } from "./use-slot-runner";

/** Focus goes back to the button that opened the dialog; the dialog has no trigger element. */
function useFocusReturn(open: boolean) {
  const target = useRef<string | null>(null);
  useEffect(() => {
    if (open || target.current === null) return;
    document.querySelector<HTMLElement>(`[data-testid="${target.current}"]`)?.focus();
    target.current = null;
  }, [open]);
  return (testId: string) => {
    target.current = testId;
  };
}

type SlotAction = (id: string) => Promise<SlotActionResult>;

/** Everything the saves screen can do with a slot, with the confirmations in between. */
export function useSlotActions(refresh: () => Promise<void>) {
  const { t } = useI18n();
  const career = useCareer();
  const { run, busy, error } = useSlotRunner(refresh);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const returnFocusTo = useFocusReturn(pending !== null);

  const closeConfirm = () => {
    if (pending) returnFocusTo(confirmTexts(pending, t).returnTestId);
    setPending(null);
  };

  const perform = (id: string, action: SlotAction, toastKey: "saved" | "imported" | "deleted") =>
    run(id, () => action(id), {
      success: t(`saves.toast.${toastKey}`, { slot: slotLabel(id, t) }),
    });

  const confirm = async () => {
    if (!pending) return;
    const { id, action } = pending;
    closeConfirm();
    if (action === "delete") await perform(id, career.deleteSlot, "deleted");
    else if (action === "import") await perform(id, career.importInto, "imported");
    else await perform(id, career.saveToSlot, "saved");
  };

  const ask = (entry: SlotEntry, action: PendingAction["action"], direct: () => Promise<void>) =>
    entry.state.kind === "empty" ? direct() : setPending({ id: entry.id, action });

  return {
    busy,
    error,
    pending,
    confirm,
    closeConfirm,
    askDelete: (entry: SlotEntry) => setPending({ id: entry.id, action: "delete" }),
    save: (entry: SlotEntry) =>
      ask(entry, "overwrite", () => perform(entry.id, career.saveToSlot, "saved")),
    chooseImportTarget: (entry: SlotEntry) =>
      ask(entry, "import", () => perform(entry.id, career.importInto, "imported")),
    cancelImport: () => {
      setPending(null);
      career.cancelImport();
    },
    load: (entry: SlotEntry) =>
      run(entry.id, () => career.loadSlot(entry.id), {
        onDone: () => {
          window.location.hash = hrefFor({ name: "home" });
        },
      }),
    exportSlot: (entry: SlotEntry) =>
      run(entry.id, () => career.exportSlot(entry.id), {
        success: t("saves.toast.exported", { slot: slotLabel(entry.id, t) }),
      }),
    exportRunning: () =>
      run("career", async () => career.exportCareer(), {
        success: t("saves.toast.exportedCareer"),
      }),
  };
}

export type SlotActions = ReturnType<typeof useSlotActions>;
