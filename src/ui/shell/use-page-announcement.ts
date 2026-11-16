import { type RefObject, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n-provider";
import { useRoute } from "../use-route";

const HEADING = "h1, h2";

/**
 * On every route change (not on the first render): moves focus to the page heading inside `main`,
 * updates the document title and returns the title for a polite live region.
 */
export function usePageAnnouncement(main: RefObject<HTMLElement | null>, fallback: string): string {
  const { t } = useI18n();
  const route = useRoute();
  const key = JSON.stringify(route);
  const first = useRef(true);
  const [title, setTitle] = useState(fallback);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the route key changes
  useEffect(() => {
    const heading = main.current?.querySelector<HTMLElement>(HEADING) ?? null;
    const page = heading?.textContent?.trim() || fallback;
    document.title = t("shell.pageTitle", { page });
    setTitle(page);
    if (first.current) {
      first.current = false;
      return;
    }
    const target = heading ?? main.current;
    if (!target) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: false });
  }, [key]);
  return title;
}
