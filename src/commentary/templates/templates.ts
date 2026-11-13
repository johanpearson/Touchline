import type { Locale } from "../../i18n";
import { en } from "./en";
import { sv } from "./sv";

export type TemplateKey = keyof typeof en;

export const templates: Record<Locale, Record<TemplateKey, readonly string[]>> = { en, sv };
