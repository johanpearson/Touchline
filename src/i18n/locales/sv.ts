import type { Message } from "../message";
import type { en } from "./en";

export const sv = {
  "app.title": "Touchline",
  "locale.label": "Språk",
  "locale.en": "Engelska",
  "locale.sv": "Svenska",
  "squad.players": { one: "{count} spelare", other: "{count} spelare" },
  "stats.possession": "Bollinnehav: {value}",
} as const satisfies Record<keyof typeof en, Message>;
