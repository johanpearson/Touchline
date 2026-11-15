import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      // A full season of 182 action-engine matches takes several seconds, and the first test of a file that plays one pays for it.
      testTimeout: 60_000,
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
      exclude: ["src/**/*.balance.test.ts", "src/**/*.perf.test.ts", "node_modules/**"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.ts", "src/main.tsx"],
        thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      },
    },
  }),
);
