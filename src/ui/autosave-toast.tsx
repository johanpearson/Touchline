import { useEffect, useRef } from "react";
import { useToast } from "./components";
import { useI18n } from "./i18n-provider";
import { useCareer } from "./use-career";

/** Raises one persistent error toast each time an autosave starts failing. */
export function AutosaveToast() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { saveStatus } = useCareer();
  const previous = useRef(saveStatus);
  useEffect(() => {
    if (saveStatus === "error" && previous.current !== "error") {
      toast({
        title: t("toast.autosaveFailed.title"),
        description: t("toast.autosaveFailed.text"),
        tone: "error",
      });
    }
    previous.current = saveStatus;
  }, [saveStatus, toast, t]);
  return null;
}
