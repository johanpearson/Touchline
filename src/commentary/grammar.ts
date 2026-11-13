import type { Locale } from "../i18n";

/**
 * The possessive form of a name, used for phrases like "{team}'s goalkeeper".
 * Swedish adds "s" unless the name already ends in s, x or z ("Kvarnby" to "Kvarnbys", "Västerås" stays).
 * English adds "'s", or just "'" after an s.
 */
export const possessive = (locale: Locale, name: string): string => {
  const last = name.slice(-1).toLowerCase();
  if (locale === "sv") return "sxz".includes(last) ? name : `${name}s`;
  return last === "s" ? `${name}'` : `${name}'s`;
};
