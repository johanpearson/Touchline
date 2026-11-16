export const THEMES = ["midnight", "graphite", "light"] as const;
export const LOCALES = ["en", "sv"] as const;

export type Theme = (typeof THEMES)[number];
export type Locale = (typeof LOCALES)[number];
export type Viewport = { readonly name: string; readonly width: number; readonly height: number };

export const DESKTOP: Viewport = { name: "desktop", width: 1440, height: 900 };
export const TABLET: Viewport = { name: "tablet", width: 1024, height: 768 };
export const PHONE: Viewport = { name: "phone", width: 390, height: 844 };

export const SCREEN_VIEWPORTS: readonly Viewport[] = [DESKTOP, TABLET, PHONE];
export const STORY_VIEWPORTS: readonly Viewport[] = [DESKTOP, PHONE];

export const WIDE_TAG = "i18n-wide";

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

export function combinations(
  viewports: readonly Viewport[],
  locales: readonly Locale[],
): readonly Combination[] {
  return viewports.flatMap((viewport) =>
    THEMES.flatMap((theme) => locales.map((locale) => ({ viewport, theme, locale }))),
  );
}

/** Snapshot file name: stable, no platform part, unique per story or screen state and combination. */
export function snapshotName(kind: "story" | "screen", id: string, c: Combination): string {
  const locale = c.locale === "en" ? "" : `-${c.locale}`;
  return `${kind}/${id}/${c.viewport.name}-${c.theme}${locale}.png`;
}
