import type { Message } from "../message";

export const en = {
  "app.title": "Touchline",
  "locale.label": "Language",
  "locale.en": "English",
  "locale.sv": "Swedish",
  "squad.players": { one: "{count} player", other: "{count} players" },
  "stats.possession": "Possession: {value}",
} as const satisfies Record<string, Message>;
