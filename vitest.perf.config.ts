import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/**
 * Performance budget tests (`*.perf.test.ts`) time the engine, so they must not share the CPU with
 * other test files. They run on their own, one file at a time, and not with `npm test`.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/**/*.perf.test.ts"],
      fileParallelism: false,
      testTimeout: 60_000,
    },
  }),
);
