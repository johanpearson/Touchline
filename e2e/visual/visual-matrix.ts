export const THEMES = ["midnight", "graphite", "light"] as const;
export const LOCALES = ["en", "sv"] as const;

export type Theme = (typeof THEMES)[number];
export type Locale = (typeof LOCALES)[number];
export type Viewport = { readonly name: string; readonly width: number; readonly height: number };

export const DESKTOP: Viewport = { name: "desktop", width: 1440, height: 900 };
export const TABLET: Viewport = { name: "tablet", width: 1024, height: 768 };
export const PHONE: Viewport = { name: "phone", width: 390, height: 844 };

/** Viewports of a screen shot in the full matrix; the core matrix drops the tablet. */
export const SCREEN_VIEWPORTS: readonly Viewport[] = [DESKTOP, TABLET, PHONE];
/** Viewports of the core matrix and of stories. */
export const CORE_VIEWPORTS: readonly Viewport[] = [DESKTOP, PHONE];
export const STORY_VIEWPORTS: readonly Viewport[] = CORE_VIEWPORTS;

/** Default theme of the core matrix; the other themes only run in the full matrix. */
export const CORE_THEMES: readonly Theme[] = ["midnight"];

/** Story tag: also shoot Swedish (midnight). */
export const WIDE_TAG = "i18n-wide";
/** Story tag: shoot every theme instead of midnight only. */
export const THEME_WIDE_TAG = "theme-wide";

export type StoryEntry = {
  readonly id: string;
  readonly type: string;
  readonly tags?: readonly string[];
};
export type Combination = {
  readonly viewport: Viewport;
  readonly theme: Theme;
  readonly locale: Locale;
};

/** Locales a story is shot in: English always, Swedish too when the story is tagged `i18n-wide`. */
export function localesFor(tags: readonly string[] = []): readonly Locale[] {
  return tags.includes(WIDE_TAG) ? LOCALES : ["en"];
}

/** Themes a story is shot in: midnight always, all three when the story is tagged `theme-wide`. */
export function themesFor(tags: readonly string[] = []): readonly Theme[] {
  return tags.includes(THEME_WIDE_TAG) ? THEMES : CORE_THEMES;
}

export function combinations(
  viewports: readonly Viewport[],
  locales: readonly Locale[],
  themes: readonly Theme[] = THEMES,
): readonly Combination[] {
  return viewports.flatMap((viewport) =>
    themes.flatMap((theme) => locales.map((locale) => ({ viewport, theme, locale }))),
  );
}

/** Core: desktop and phone, midnight, English (2 shots). Full: 3 widths x 3 themes x 2 languages (18 shots). */
export function screenCombinations(full: boolean): readonly Combination[] {
  return full
    ? combinations(SCREEN_VIEWPORTS, LOCALES)
    : combinations(CORE_VIEWPORTS, ["en"], CORE_THEMES);
}

/** Snapshot file name: stable, no platform part, unique per story or screen state and combination. */
export function snapshotName(kind: "story" | "screen", id: string, c: Combination): string {
  const locale = c.locale === "en" ? "" : `-${c.locale}`;
  return `${kind}/${id}/${c.viewport.name}-${c.theme}${locale}.png`;
}
