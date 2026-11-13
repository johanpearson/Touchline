import type { Locale } from "./locale";
import type { MessageKey } from "./messages";
import { messages } from "./messages";

export type Params = Record<string, string | number>;

export type Translator = {
  locale: Locale;
  t: (key: MessageKey, params?: Params) => string;
  formatNumber: (value: number, fractionDigits?: number) => string;
  formatPercent: (ratio: number, fractionDigits?: number) => string;
};

function interpolate(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

export function createTranslator(locale: Locale): Translator {
  const plural = new Intl.PluralRules(locale);
  const number = (value: number, style: "decimal" | "percent", digits: number) =>
    new Intl.NumberFormat(locale, {
      style,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

  return {
    locale,
    t(key, params = {}) {
      const message = messages[locale][key];
      if (typeof message === "string") return interpolate(message, params);
      const count = Number(params.count);
      return interpolate(message[plural.select(count) === "one" ? "one" : "other"], params);
    },
    formatNumber: (value, fractionDigits = 2) => number(value, "decimal", fractionDigits),
    formatPercent: (ratio, fractionDigits = 0) => number(ratio, "percent", fractionDigits),
  };
}
