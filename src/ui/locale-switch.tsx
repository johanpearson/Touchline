import { isLocale, locales } from "../i18n";
import { useI18n } from "./i18n-provider";

export function LocaleSwitch() {
  const { t, locale, setLocale } = useI18n();
  return (
    <label>
      {t("locale.label")}{" "}
      <select
        data-testid="locale-switch"
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value);
        }}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {t(`locale.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
