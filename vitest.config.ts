import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      // A full season of 182 action-engine matches takes several seconds, and the first test of a file that plays one pays for it. Tests that play two or three seasons take about a minute on a CI runner.
      testTimeout: 300_000,
      exclude: ["src/**/*.balance.test.ts", "src/**/*.perf.test.ts", "node_modules/**"],
      // Two projects. UI and platform tests render into a shared jsdom, so each file gets its own worker (a fresh
      // DOM and module state). Everything else is pure logic: its files share workers, which saves starting a
      // worker per file (about 0.5 s each, a quarter of the CPU time of the whole run) and lets the files of
      // a worker reuse the played seasons in src/game/season-test-helpers.ts. A test of pure logic must not
      // keep state between tests; the suite ran green with isolation off for all of them.
      projects: [
        {
          extends: true,
          test: {
            name: "ui",
            include: ["src/ui/**/*.test.{ts,tsx}", "src/platform/**/*.test.{ts,tsx}"],
          },
        },
        {
          extends: true,
          test: {
            name: "logic",
            isolate: false,
            // Plays the default career's first season once for all workers (src/game/season-test-helpers.ts).
            globalSetup: ["./src/game/season-global-setup.ts"],
            include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
            exclude: [
              "src/ui/**",
              "src/platform/**",
              "src/**/*.balance.test.ts",
              "src/**/*.perf.test.ts",
              "node_modules/**",
            ],
          },
        },
      ],
      coverage: {
        provider: "v8",
        // lcov is read by the CodeScene upload (the "Upload coverage to CodeScene" step in .github/workflows/ci.yml).
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.test.{ts,tsx}",
          "src/**/*.stories.tsx",
          "src/**/index.ts",
          "src/main.tsx",
        ],
        thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      },
    },
  }),
);
