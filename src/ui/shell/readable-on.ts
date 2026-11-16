import { contrastRatio, parseHexColour } from "../theme/contrast";

const LIGHT = "#ffffff";
const DARK = "#0a0e17";

/** Light or dark text, whichever reads better on the given club colour. */
export function readableOn(background: string): string {
  const rgb = parseHexColour(background);
  if (!rgb) return LIGHT;
  const light = parseHexColour(LIGHT);
  const dark = parseHexColour(DARK);
  if (!light || !dark) return LIGHT;
  return contrastRatio(rgb, dark) > contrastRatio(rgb, light) ? DARK : LIGHT;
}
