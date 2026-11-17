import { useState } from "react";
import { useToast } from "../components";
import { useI18n } from "../i18n-provider";
import type { SlotActionResult, SlotError } from "../save-slots";
import { SLOT_ERROR_KEYS } from "../start/slot-error-keys";

type Outcome = {
  /** Toast shown when the action succeeded. */
  success?: string;
  /** Called after a successful action (for example to open the hub). */
  onDone?: () => void;
};

/**
 * Runs one slot action at a time: blocks other actions while it runs, shows a success toast or an
 * error (inline under the row and as a toast) and refreshes the rows afterwards.
 */
export function useSlotRunner(refresh: () => Promise<void>) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ id: string; error: SlotError } | null>(null);

  const run = async (id: string, action: () => Promise<SlotActionResult>, outcome?: Outcome) => {
    setBusy(true);
    setError(null);
    const result = await action();
    if (result.ok) {
      if (outcome?.success) toast({ title: outcome.success, tone: "success" });
      outcome?.onDone?.();
    } else {
      setError({ id, error: result.error });
      toast({
        title: t("saves.toast.failed"),
        description: t(SLOT_ERROR_KEYS[result.error]),
        tone: "error",
      });
    }
    await refresh();
    setBusy(false);
  };

  return { run, busy, error };
}
