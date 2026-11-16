export type Rgb = readonly [number, number, number];

/** Reads `#rgb` or `#rrggbb`. Returns null for anything else (named colours, rgba, ...). */
export const parseHexColour = (value: string): Rgb | null => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const digits =
    (match[1] as string).length === 3
      ? [...(match[1] as string)].map((d) => d + d).join("")
      : (match[1] as string);
  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ];
};

const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** WCAG contrast ratio, 1 to 21, independent of the order of the colours. */
export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((light as number) + 0.05) / ((dark as number) + 0.05);
};
