import { Check } from "lucide-react";
import { cn } from "../components";
import { useI18n } from "../i18n-provider";
import { useTheme } from "../theme/theme-provider";
import { isTheme, THEMES, type Theme } from "../theme/themes";

/** A miniature screen drawn with the previewed theme's own tokens (see `data-theme-preview`). */
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <span
      aria-hidden="true"
      data-theme-preview={theme}
      className="flex h-16 w-full overflow-hidden rounded-md border border-line bg-bg"
    >
      <span className="w-1/4 bg-side" />
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="h-2 w-2/3 rounded-pill bg-text" />
        <span className="flex flex-1 gap-1.5">
          <span className="flex-1 rounded-sm border border-line bg-surface" />
          <span className="flex-1 rounded-sm bg-raised" />
        </span>
        <span className="h-2 w-1/3 rounded-pill bg-accent" />
      </span>
    </span>
  );
}

/** The theme choice: three preview cards in one radio group (native radios, arrow keys work). */
export function ThemeCards() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label={t("settings.theme.group")}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {THEMES.map((name) => (
        <label
          key={name}
          data-testid={`theme-card-${name}`}
          className={cn(
            "relative flex min-h-11 cursor-pointer flex-col gap-2 rounded-lg border bg-surface p-3",
            "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
            theme === name ? "border-accent" : "border-line hover:bg-raised",
          )}
        >
          <input
            type="radio"
            name="theme"
            value={name}
            checked={theme === name}
            onChange={(event) => {
              if (isTheme(event.target.value)) setTheme(event.target.value);
            }}
            className="sr-only"
          />
          <ThemePreview theme={name} />
          <span className="flex items-center justify-between gap-2 font-semibold">
            {t(`theme.${name}`)}
            {theme === name ? <Check aria-hidden="true" className="size-4 text-accent" /> : null}
          </span>
        </label>
      ))}
    </div>
  );
}
