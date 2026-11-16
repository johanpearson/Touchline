export type ThemeTokens = Record<string, Record<string, string>>;

const THEME_BLOCK = /:root\[data-theme="([a-z-]+)"\]\s*\{([^}]*)\}/g;
const DECLARATION = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;

/** Reads the custom properties of every `:root[data-theme="..."]` block of a token file. */
export const parseThemeTokens = (css: string): ThemeTokens => {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const themes: ThemeTokens = {};
  for (const block of source.matchAll(THEME_BLOCK)) {
    const tokens: Record<string, string> = {};
    for (const declaration of (block[2] as string).matchAll(DECLARATION)) {
      tokens[declaration[1] as string] = (declaration[2] as string).trim();
    }
    themes[block[1] as string] = tokens;
  }
  return themes;
};
