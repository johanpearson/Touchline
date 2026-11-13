export type Rgb = { r: number; g: number; b: number };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Parses `#rrggbb` into 0..1 channels. Returns grey for anything else. */
export const parseHexColour = (hex: string): Rgb => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return { r: 0.5, g: 0.5, b: 0.5 };
  const channel = (digits: string | undefined): number => Number.parseInt(digits ?? "0", 16) / 255;
  return { r: channel(match[1]), g: channel(match[2]), b: channel(match[3]) };
};

const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** Turns the raw away share of pressure (0..1) into a sharp but soft-edged colour mix. */
export const territoryMix = (awayShare: number): number => smoothstep((awayShare - 0.3) / 0.4);

/** Colour of one vertex: the team blend, brighter where the surface is higher. */
export const vertexColour = (home: Rgb, away: Rgb, awayShare: number, height: number): Rgb => {
  const mix = territoryMix(awayShare);
  const light = 0.72 + 0.4 * clamp01(height / 2.5);
  const channel = (a: number, b: number): number => (a + (b - a) * mix) * light;
  return { r: channel(home.r, away.r), g: channel(home.g, away.g), b: channel(home.b, away.b) };
};
