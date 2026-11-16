import { useI18n } from "../i18n-provider";
import { useTheme } from "./theme-provider";
import { isTheme, THEMES } from "./themes";

/** Temporary switch next to the language switch; the settings screen replaces it later. */
export function ThemeSwitch({
  className,
  selectClassName,
}: {
  className?: string;
  selectClassName?: string;
} = {}) {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  return (
    <label className={className}>
      {t("theme.label")}{" "}
      <select
        className={selectClassName}
        data-testid="theme-switch"
        value={theme}
        onChange={(e) => {
          if (isTheme(e.target.value)) setTheme(e.target.value);
        }}
      >
        {THEMES.map((name) => (
          <option key={name} value={name}>
            {t(`theme.${name}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
