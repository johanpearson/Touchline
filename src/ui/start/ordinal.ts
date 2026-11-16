import type { Locale } from "../../i18n";

const EN_SUFFIXES: Record<string, string> = { one: "st", two: "nd", few: "rd" };

const englishOrdinal = (n: number): string => {
  const category = new Intl.PluralRules("en", { type: "ordinal" }).select(n);
  return `${n}${EN_SUFFIXES[category] ?? "th"}`;
};

/** Swedish writes 1:a and 2:a (also 21:a, 22:a, but 11:e and 12:e), and :e for the rest. */
const swedishOrdinal = (n: number): string => {
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  const first = (lastDigit === 1 || lastDigit === 2) && lastTwo !== 11 && lastTwo !== 12;
  return `${n}:${first ? "a" : "e"}`;
};

/** A table position as an ordinal in the locale: 3rd in English, 3:e in Swedish. */
export function formatOrdinal(n: number, locale: Locale): string {
  return locale === "sv" ? swedishOrdinal(n) : englishOrdinal(n);
}
