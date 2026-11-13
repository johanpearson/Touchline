import type { Message } from "../message";
import type { en } from "./en";

export const sv = {
  "app.title": "Touchline",
  "locale.label": "Språk",
  "locale.en": "Engelska",
  "locale.sv": "Svenska",
  "squad.players": { one: "{count} spelare", other: "{count} spelare" },
  "stats.possession": "Bollinnehav: {value}",
  "period.firstHalf": "Första halvlek",
  "period.halfTime": "Halvtid",
  "period.secondHalf": "Andra halvlek",
  "period.fullTime": "Full tid",
  "scoreboard.label": "Resultattavla",
  "stats.title": "Matchstatistik",
  "stats.label.possession": "Bollinnehav",
  "stats.label.fieldTilt": "Planövertag",
  "stats.label.shots": "Skott",
  "stats.label.shotsOnTarget": "Skott på mål",
  "stats.label.xg": "xG",
  "stats.label.corners": "Hörnor",
  "chart.title": "Momentum",
  "chart.label":
    "Momentumdiagram: staplar ovanför linjen visar hemmalagets tryck, staplar under visar bortalagets",
  "feed.title": "Kommentarer",
  "controls.label": "Matchkontroller",
  "controls.pause": "Pausa",
  "controls.play": "Spela",
  "controls.speed": "Hastighet",
  "halfTime.title": "Halvtid",
  "halfTime.changes": "Byten och taktik",
  "halfTime.changesPlaceholder":
    "Ändringar av laguppställning och taktik kommer här i en senare version.",
  "halfTime.start": "Starta andra halvlek",
  "match.terrain": "Matchens momentumterräng",
} as const satisfies Record<keyof typeof en, Message>;
