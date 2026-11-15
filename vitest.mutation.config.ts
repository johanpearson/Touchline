// @ts-nocheck
import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// Test selection for Stryker runs on `src/engine`: the engine's own unit and property tests.
// Tests outside the engine are left out because instrumented code is several times slower and
// wall-clock budgets such as the season test in `src/game` fail the initial dry run.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["src/engine/**/*.test.ts"],
    },
  }),
);
