import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      exclude: ["src/**/*.balance.test.ts", "node_modules/**"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.ts", "src/main.tsx"],
        thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      },
    },
  }),
);
