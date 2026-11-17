import type { Translator } from "../../i18n";
import { isManualSlot } from "../save-slots";

/** "Autosave" or "Slot 2": the name a slot goes by in rows, dialogs and toasts. */
export const slotLabel = (id: string, t: Translator["t"]): string =>
  isManualSlot(id)
    ? t("saves.slot.manual", { number: id.replace("slot-", "") })
    : t("saves.slot.autosave");

/** A save time as a short local date and time; the raw text when it is not a valid date. */
export const formatSavedTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
};
