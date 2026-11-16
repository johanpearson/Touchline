export type PaletteGroup = "screens" | "clubs" | "players" | "actions";

/** Groups in the order the palette lists them. */
export const PALETTE_GROUPS: readonly PaletteGroup[] = ["screens", "clubs", "players", "actions"];

/** Groups that are listed before anything is typed. */
const GROUPS_WITHOUT_QUERY: readonly PaletteGroup[] = ["screens", "actions"];

/** The most results shown for one group. */
export const MAX_RESULTS_PER_GROUP = 8;

export type SearchItem = { id: string; group: PaletteGroup; label: string };

export type IndexedItem<T extends SearchItem> = {
  item: T;
  normalized: string;
  words: readonly string[];
};

export type SearchIndex<T extends SearchItem = SearchItem> = readonly IndexedItem<T>[];

export type GroupResult<T extends SearchItem = SearchItem> = { group: PaletteGroup; items: T[] };

/** Lower case, without diacritics ("Västerås" becomes "vasteras"), single spaces. */
export const normalizeText = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Prepares the items once, so that a keystroke only compares strings. */
export const buildSearchIndex = <T extends SearchItem>(items: readonly T[]): SearchIndex<T> =>
  items.map((item) => {
    const normalized = normalizeText(item.label);
    return { item, normalized, words: normalized.split(" ") };
  });

const RANK_PREFIX = 0;
const RANK_WORD_START = 1;

/** 0: the label starts with the query; 1: every query word starts a word; null: no match. */
const rankOf = (entry: IndexedItem<SearchItem>, query: string, tokens: readonly string[]) => {
  if (entry.normalized.startsWith(query)) return RANK_PREFIX;
  const all = tokens.every((token) => entry.words.some((word) => word.startsWith(token)));
  return all ? RANK_WORD_START : null;
};

const withoutQuery = <T extends SearchItem>(index: SearchIndex<T>): GroupResult<T>[] =>
  collect(GROUPS_WITHOUT_QUERY, (group) =>
    index.filter((e) => e.item.group === group).map((e) => e.item),
  );

const collect = <T extends SearchItem>(
  groups: readonly PaletteGroup[],
  itemsOf: (group: PaletteGroup) => T[],
): GroupResult<T>[] =>
  groups
    .map((group) => ({ group, items: itemsOf(group).slice(0, MAX_RESULTS_PER_GROUP) }))
    .filter((result) => result.items.length > 0);

/**
 * Items matching the query, grouped. Names that start with the query come first, then names
 * where a later word starts with it; ties keep the order of the index. Diacritics are ignored.
 * An empty query lists only screens and actions.
 */
export function searchPalette<T extends SearchItem>(
  index: SearchIndex<T>,
  query: string,
): GroupResult<T>[] {
  const normalized = normalizeText(query);
  if (normalized === "") return withoutQuery(index);
  const tokens = normalized.split(" ");
  const ranked = index.flatMap((entry, position) => {
    const rank = rankOf(entry, normalized, tokens);
    return rank === null ? [] : [{ item: entry.item, rank, position }];
  });
  ranked.sort((a, b) => a.rank - b.rank || a.position - b.position);
  return collect(PALETTE_GROUPS, (group) =>
    ranked.filter((r) => r.item.group === group).map((r) => r.item),
  );
}
