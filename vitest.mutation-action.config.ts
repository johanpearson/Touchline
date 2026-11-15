import { defineConfig, mergeConfig } from "vitest/config";
import mutationConfig from "./vitest.mutation.config";

// Faster test selection for iterating on `src/engine/action`. The four whole-match files below
// are about 80% of the engine suite's run time and cover almost every mutant, so each survivor
// would re-run them. Leaving them out can only lower the score (a lower bound); the nightly
// engine-wide run (`stryker.config.json`) keeps them.
export default mergeConfig(
  mutationConfig,
  defineConfig({
    test: {
      exclude: [
        "src/engine/action/fast-detail.test.ts",
        "src/engine/action/create-action-match.test.ts",
        "src/engine/action/action-match.property.test.ts",
        "src/engine/action/apply-action-change.test.ts",
      ],
    },
  }),
);
