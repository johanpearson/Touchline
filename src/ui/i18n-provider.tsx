import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { createTranslator, defaultLocale, isLocale, type Locale, type Translator } from "../i18n";
import type { LocaleStore } from "../shared";

type I18nContextValue = Translator & { setLocale: (locale: Locale) => void };

const I18nContext = createContext<I18nContextValue | null>(null);

type Props = { store: LocaleStore; children: ReactNode };

export function I18nProvider({ store, children }: Props) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = store.load();
    return isLocale(saved) ? saved : defaultLocale;
  });

  const value = useMemo<I18nContextValue>(
    () => ({
      ...createTranslator(locale),
      setLocale: (next) => {
        store.save(next);
        setLocaleState(next);
      },
    }),
    [locale, store],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
