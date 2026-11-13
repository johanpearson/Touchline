import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/** Balance tests simulate many matches, so they run on their own and not with `npm test`. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      silent: false,
      include: ["src/**/*.balance.test.ts"],
      testTimeout: 60_000,
    },
  }),
);
