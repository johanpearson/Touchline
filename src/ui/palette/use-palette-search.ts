import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { useI18n } from "../i18n-provider";
import { panelOpener, useMatchLock } from "../match-lock/match-lock";
import { hrefFor } from "../routes";
import { useTheme } from "../theme/theme-provider";
import { useCareer } from "../use-career";
import { isNavigationKey, nextActiveIndex } from "./active-index";
import { buildPaletteItems, type PaletteItem } from "./palette-items";
import { usePalette } from "./palette-provider";
import { buildSearchIndex, type GroupResult, searchPalette } from "./search";

export const optionId = (listId: string, itemId: string) => `${listId}-${itemId}`;

export type PaletteSearch = {
  listId: string;
  query: string;
  groups: GroupResult<PaletteItem>[];
  count: number;
  activeId: string | undefined;
  setQuery: (query: string) => void;
  setActiveId: (id: string) => void;
  choose: (item: PaletteItem) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

/** The prepared index, the typed query, the highlighted result and what choosing a result does. */
export function usePaletteSearch(): PaletteSearch {
  const i18n = useI18n();
  const { career } = useCareer();
  const { theme, setTheme } = useTheme();
  const { setOpen } = usePalette();
  const lock = useMatchLock();
  const listId = useId();
  const [query, setQueryState] = useState("");
  const [activeKey, setActiveKey] = useState<string | undefined>();

  const index = useMemo(
    () => buildSearchIndex(career ? buildPaletteItems({ career, translator: i18n, theme }) : []),
    [career, i18n, theme],
  );
  const groups = useMemo(() => searchPalette(index, query), [index, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeItem = flat.find((item) => optionId(listId, item.id) === activeKey) ?? flat[0];

  const choose = (item: PaletteItem) => {
    setOpen(false);
    const { target } = item;
    if (target.kind === "route") {
      const openPanel = panelOpener(lock, target.route);
      if (openPanel) openPanel();
      else window.location.hash = hrefFor(target.route);
    } else if (target.kind === "theme") setTheme(target.theme);
    else i18n.setLocale(target.locale);
  };

  const move = (key: Parameters<typeof nextActiveIndex>[2]) => {
    const current = activeItem ? flat.indexOf(activeItem) : -1;
    const next = flat[nextActiveIndex(current, flat.length, key)];
    if (next) setActiveKey(optionId(listId, next.id));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isNavigationKey(event.key)) {
      event.preventDefault();
      move(event.key);
    } else if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      choose(activeItem);
    }
  };

  return {
    listId,
    query,
    groups,
    count: flat.length,
    activeId: activeItem ? optionId(listId, activeItem.id) : undefined,
    setQuery: (next) => {
      setQueryState(next);
      setActiveKey(undefined);
    },
    setActiveId: setActiveKey,
    choose,
    onKeyDown,
  };
}
