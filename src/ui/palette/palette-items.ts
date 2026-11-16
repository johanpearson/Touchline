import { Languages, type LucideIcon, Palette, Play } from "lucide-react";
import type { Career } from "../../game";
import { type Locale, locales, type Translator } from "../../i18n";
import { headerActionFor } from "../shell/header-action";
import { type LinkRoute, NAV_ITEMS, navRoute } from "../shell/nav-config";
import { THEMES, type Theme } from "../theme/themes";
import type { SearchItem } from "./search";

export type PaletteTarget =
  | { kind: "route"; route: LinkRoute }
  | { kind: "theme"; theme: Theme }
  | { kind: "locale"; locale: Locale };

export type PaletteItem = SearchItem & {
  target: PaletteTarget;
  /** Second line: position and club for a player. */
  detail?: string;
  icon?: LucideIcon;
  /** Club badge for club results. */
  crest?: { shortName: string; colours: { primary: string; secondary: string } };
};

export type PaletteItemsInput = { career: Career; translator: Translator; theme: Theme };

const screenItems = ({ career, translator }: PaletteItemsInput): PaletteItem[] =>
  NAV_ITEMS.map((nav) => ({
    id: `screen-${nav.id}`,
    group: "screens",
    label: translator.t(nav.labelKey),
    icon: nav.icon,
    target: { kind: "route", route: navRoute(nav, career.userClubId) },
  }));

const clubItems = ({ career }: PaletteItemsInput): PaletteItem[] =>
  career.league.clubs.map((club) => ({
    id: `club-${club.id}`,
    group: "clubs",
    label: club.name,
    crest: { shortName: club.shortName, colours: club.colours },
    target: { kind: "route", route: { name: "club", clubId: club.id } },
  }));

/** Players open their club's screen until the player profile exists. */
const playerItems = ({ career, translator }: PaletteItemsInput): PaletteItem[] => {
  const clubOf = new Map<string, Career["league"]["clubs"][number]>();
  for (const club of career.league.clubs) {
    for (const playerId of club.playerIds) clubOf.set(playerId, club);
  }
  return career.league.players.flatMap((player): PaletteItem[] => {
    const club = clubOf.get(player.id);
    if (!club) return [];
    return [
      {
        id: `player-${player.id}`,
        group: "players",
        label: player.name,
        detail: translator.t("palette.playerDetail", {
          position: translator.t(`position.short.${player.position}`),
          club: club.name,
        }),
        target: { kind: "route", route: { name: "club", clubId: club.id } },
      },
    ];
  });
};

const actionItems = ({ career, translator, theme }: PaletteItemsInput): PaletteItem[] => {
  const { t } = translator;
  const play: PaletteItem[] =
    headerActionFor(career)?.kind === "continue"
      ? [
          {
            id: "action-play",
            group: "actions",
            label: t("palette.action.play"),
            icon: Play,
            target: { kind: "route", route: { name: "match" } },
          },
        ]
      : [];
  const themes = THEMES.filter((name) => name !== theme).map(
    (name): PaletteItem => ({
      id: `action-theme-${name}`,
      group: "actions",
      label: t("palette.action.theme", { theme: t(`theme.${name}`) }),
      icon: Palette,
      target: { kind: "theme", theme: name },
    }),
  );
  const languages = locales
    .filter((locale) => locale !== translator.locale)
    .map(
      (locale): PaletteItem => ({
        id: `action-locale-${locale}`,
        group: "actions",
        label: t("palette.action.locale", { language: t(`locale.${locale}`) }),
        icon: Languages,
        target: { kind: "locale", locale },
      }),
    );
  return [...play, ...themes, ...languages];
};

/** Everything the palette can open, labelled in the current language. */
export const buildPaletteItems = (input: PaletteItemsInput): PaletteItem[] => [
  ...screenItems(input),
  ...clubItems(input),
  ...playerItems(input),
  ...actionItems(input),
];
