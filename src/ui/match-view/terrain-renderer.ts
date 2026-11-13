import type { TerrainRendererFactory } from "./terrain/renderer-types";

export type {
  TerrainRenderer,
  TerrainRendererFactory,
  TerrainRendererOptions,
} from "./terrain/renderer-types";

/** Loads three.js on first use so it stays out of the initial bundle. */
export const createDefaultRenderer: TerrainRendererFactory = async (host, options) => {
  const { createThreeRenderer } = await import("./three/three-renderer");
  return createThreeRenderer(host, options);
};
