import type { Locale } from "../../i18n";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Below this the save counts as "just now". */
export const JUST_NOW_MS = MINUTE;

type Step = { unit: Intl.RelativeTimeFormatUnit; ms: number };

const MINUTES: Step = { unit: "minute", ms: MINUTE };
const STEPS: readonly Step[] = [{ unit: "day", ms: DAY }, { unit: "hour", ms: HOUR }, MINUTES];

export type RelativeTime = { kind: "just-now" } | { kind: "ago"; text: string };

/**
 * How long before `nowIso` the time `thenIso` was, in the locale's own words ("2 hours ago",
 * "för 2 timmar sedan", "yesterday"). Both times come from the injected clock; this never reads
 * the time itself. A time that cannot be read or lies in the future counts as "just now".
 */
export function relativeTime(thenIso: string, nowIso: string, locale: Locale): RelativeTime {
  const then = Date.parse(thenIso);
  const now = Date.parse(nowIso);
  const elapsed = now - then;
  if (Number.isNaN(elapsed) || elapsed < JUST_NOW_MS) return { kind: "just-now" };
  const { unit, ms } = STEPS.find((step) => elapsed >= step.ms) ?? MINUTES;
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return { kind: "ago", text: format.format(-Math.floor(elapsed / ms), unit) };
}
