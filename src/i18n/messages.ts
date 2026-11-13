import type { Locale } from "./locale";
import { en } from "./locales/en";
import { sv } from "./locales/sv";
import type { Message } from "./message";

export type MessageKey = keyof typeof en;

export const messages: Record<Locale, Record<MessageKey, Message>> = { en, sv };
