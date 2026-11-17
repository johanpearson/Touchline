import type { Locale } from "../i18n";

const MILLION = 1000;

const grouped = (locale: Locale, value: number, digits: number): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

/**
 * An amount in thousands of the fictional euro as "€1.2M" (English) or "1,2 M€" (Swedish); under a
 * million as "€450k" / "450 k€". Negative amounts start with a true minus sign (U+2212).
 */
export const formatMoney = (thousands: number, locale: Locale): string => {
  const abs = Math.abs(thousands);
  const million = abs >= MILLION;
  const number = million ? grouped(locale, abs / MILLION, 1) : grouped(locale, abs, 0);
  const unit = million ? "M" : "k";
  const text = locale === "sv" ? `${number} ${unit}€` : `€${number}${unit}`;
  return thousands < 0 ? `−${text}` : text;
};
