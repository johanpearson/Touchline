import type { ReactNode } from "react";
import { ToastProvider } from "./components";
import { useI18n } from "./i18n-provider";

/** The app's toast region with its labels in the active language. */
export function Toasts({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <ToastProvider dismissLabel={t("toast.dismiss")} viewportLabel={t("toast.region")}>
      {children}
    </ToastProvider>
  );
}
