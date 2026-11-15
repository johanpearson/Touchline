import { defineConfig, mergeConfig } from "vitest/config";
import mutationConfig from "./vitest.mutation.config";

// Faster test selection for `src/engine/action`. The two whole-match files below (200 seeded
// matches, and a property suite) are most of the engine suite's run time, so each survivor would
// re-run them. Leaving them out can only lower the score (a lower bound); the nightly
// engine-wide run (`stryker.config.json`) keeps them.
export default mergeConfig(
  mutationConfig,
  defineConfig({
    test: {
      exclude: [
        "src/engine/action/fast-detail.test.ts",
        "src/engine/action/action-match.property.test.ts",
      ],
    },
  }),
);
