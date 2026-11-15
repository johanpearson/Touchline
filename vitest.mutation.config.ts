import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Test selection for Stryker runs on `src/engine`: the engine's own unit and property tests.
// Tests outside the engine are left out because instrumented code is several times slower and
// wall-clock budgets such as the season test in `src/game` fail the initial dry run.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/engine/**/*.test.ts"],
      exclude: ["src/**/*.balance.test.ts", "src/**/*.perf.test.ts", "node_modules/**"],
    },
  }),
);
