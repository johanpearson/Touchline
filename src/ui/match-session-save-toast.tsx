import { useEffect, useRef } from "react";
import { useToast } from "./components";
import { useI18n } from "./i18n-provider";
import { useMatchSessions } from "./match-session-provider";

/** Raises one persistent error toast each time writing the match session starts failing. */
export function MatchSessionSaveToast() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { writeFailed } = useMatchSessions();
  const previous = useRef(writeFailed);
  useEffect(() => {
    if (writeFailed && !previous.current) {
      toast({
        title: t("toast.matchSessionSave.title"),
        description: t("toast.matchSessionSave.text"),
        tone: "error",
      });
    }
    previous.current = writeFailed;
  }, [writeFailed, toast, t]);
  return null;
}
