import { Search } from "lucide-react";
import { cn } from "../components";
import { useI18n } from "../i18n-provider";
import { usePalette } from "./palette-provider";

const isApple = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Header button that opens the palette: a search field look on desktop, an icon on phones. */
export function PaletteButton() {
  const { t } = useI18n();
  const { setOpen } = usePalette();
  return (
    <button
      type="button"
      data-testid="palette-open"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={() => setOpen(true)}
      title={t("palette.openHint")}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-sunk text-muted",
        "hover:text-text focus-visible:outline-2 focus-visible:outline-focus",
        "max-md:size-11 max-md:px-0 md:w-56 md:justify-start md:px-3",
      )}
    >
      <Search aria-hidden="true" className="size-5 shrink-0" />
      <span className="sr-only md:not-sr-only md:flex-1 md:truncate md:text-left">
        {t("palette.open")}
      </span>
      <kbd className="hidden rounded-sm border border-line px-1.5 text-xs text-soft md:inline">
        {isApple() ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
