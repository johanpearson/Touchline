# CLAUDE.md

Guidance for Claude Code sessions in this repository. Read this file, `docs/vision.md` and `docs/architecture.md` before starting any task; for UI work also read `docs/design.md` (binding design decisions) and the boards in `reference/ui/`. `AGENTS.md` describes how to check and improve Code Health with the CodeScene MCP server; follow it before committing and before opening a PR.

## Project

**Touchline** (working name) is a single-player football management game in the spirit of Football Manager, with less detail but real depth. Desktop browser first, fictional leagues, clubs and players. Matches are simulated by a deterministic zone-based engine and shown as an animated "momentum terrain" pitch (see `reference/match-view-prototype.html`).

## Commands

```bash
npm ci                  # install
npm run dev             # dev server
npm run storybook       # component stories (npm run build-storybook compiles them)
npm run lint            # Biome lint + format check
npm run format          # Biome format (write)
npm run typecheck       # tsc --noEmit
npm run depcheck        # dependency-cruiser module boundaries
npm test                # Vitest unit tests
npm run test:coverage   # unit tests with coverage thresholds
npm run test:balance      # full balance suite (all seeded matches, incl. the 81 tactic combinations)
npm run test:balance:fast # fast subset: skips action-no-dominant-tactic-*.balance.test.ts
npm run test:balance:group -- <name> # one group of the full suite (game, tactics-attacking, tactics-balanced, tactics-defensive)
npm run test:perf       # engine performance budget (runs alone, serially)
npm run test:e2e        # Playwright E2E (smoke: npm run test:e2e:smoke)
npm run test:visual     # visual regression: screenshots of stories and screens (builds Storybook and the app first)
npm run test:visual:update # regenerate baselines (CI does this; see below)
npm run build           # production build
```

Before opening a PR, run: `npm run lint && npm run typecheck && npm run depcheck && npm test && npm run build`.

## Nightly status

Before changing `src/engine/**`, read the latest nightly results and check that the balance and mutation results are not red:

```bash
git fetch origin nightly-status
git show origin/nightly-status:status.json
```

`status.json` lists every nightly job (balance, mutation, property tests, e2e) with pass/fail, date, commit, run URL and key numbers. The branch `nightly-status` is written only by the nightly workflow; never push to it by hand.

## Language

- Everything in the repo is **English**: code, comments, docs, commits, issues, PRs.
- The game UI supports **English and Swedish**. Never hardcode user-facing strings; use i18n keys (see Architecture).

## Workflow (always)

1. **Every change starts from a GitHub issue.** If none exists, create one with `gh issue create` (labels, milestone) and add it to the project. One issue should fit in one session.
2. Move the issue to **In Progress** in the GitHub Project.
3. Branch: `<type>/<issue-number>-<short-slug>`, e.g. `feat/12-zone-engine-v1`.
4. **TDD**: write a failing test first, make it pass, refactor. Commit in small steps.
5. Commits and PR titles follow **Conventional Commits** (`feat(engine): ...`, `fix(ui): ...`, `test: ...`, `chore(ci): ...`).
6. Open a PR with `gh pr create`, fill in the template, and include `Closes #<n>`.
7. Enable auto-merge: `gh pr merge --auto --squash`. CI is the gate; never bypass it.
8. If you discover new work, create a new issue instead of growing the PR. Note follow-ups in the PR description.

Never push directly to `main`. Never disable, skip or weaken tests or CI checks to get green. If a check is wrong, fix it in its own PR with an explanation.

## Architecture rules (enforced in CI)

- `src/engine` is **pure TypeScript**: no DOM, no browser APIs, no `Math.random`, no `Date.now`/`new Date()`, no imports from other `src/` modules except `src/shared`. All randomness comes from the seeded RNG passed in.
- `src/game` (career, league, squads) may import `engine` and `shared` only.
- `src/commentary` may import `engine`, `i18n`, `shared`.
- `src/platform` holds adapters (save storage, file export, later Tauri). Only `ui` and the app composition root import `platform`.
- `src/ui` may import everything above, but talks to `engine`/`game` only through their public `index.ts`.
- Platform-specific code always sits behind an interface in `platform` so the app can later be packaged with Tauri without touching game logic.
- Routing must work without server support (hash or in-memory routing).

## Coding conventions

- TypeScript `strict`, no `any` (use `unknown` and narrow). Prefer `type` over `interface` unless extending.
- Pure functions and immutable data in `engine` and `game`. State transitions return new state.
- Named exports only. One concept per file. Files `kebab-case.ts`, types `PascalCase`, functions `camelCase`.
- Keep functions small; extract when a function needs a comment to explain its sections.
- Errors: throw only for programmer errors; return result types for expected failures (e.g. invalid save file).
- No new runtime dependency without stating why in the PR description. Everything must be free and open source.

## Testing conventions

- Vitest, tests next to code: `foo.ts` and `foo.test.ts`.
- Test names describe behaviour: `it("gives possession to the defending team after a missed shot")`.
- Arrange / act / assert, one behaviour per test. Use builders for test data (`aTeam().withAttack(0.7).build()`).
- Engine tests are deterministic: fixed seeds, exact expectations where possible.
- **Balance tests** (`*.balance.test.ts`) simulate many seeded matches and assert realistic ranges (goals per match, shots, xG vs goals, home win rate). Changing engine behaviour requires these to stay green, or a deliberate, documented range change.
- CI runs the balance suite in two ways: the PR `Balance` check is a matrix of three parallel fast jobs (`balance-fast`, `FAST_GROUPS` in `scripts/balance-groups.mjs`) or, when the PR changes `src/engine/**`, `vitest.balance.config.ts`, `scripts/balance-groups.mjs`, `ci.yml` or any `*.balance.test.ts`, or carries the label `full-balance`, a matrix of parallel jobs (`balance-shard`), one per group in `scripts/balance-groups.mjs` (`test:balance:group -- <name>`); the final `Balance` job waits for them and fails if any part failed, so the required check name does not change. A new `*.balance.test.ts` must be added to a group (a test fails otherwise). The nightly job `Balance (full)` always plays the same groups in parallel, joins their logs into one `balance` result and opens one `ci: nightly balance failed (<date>)` issue naming the failed groups on failure. A regression only the 81 combinations catch can therefore surface the next morning.
- Coverage thresholds are enforced in CI. `engine` and `game` aim for 90%+ lines and branches.
- E2E (Playwright) covers user flows, not logic. Use `data-testid` selectors.
- **Visual regression** (`e2e/visual/`, `playwright.visual.config.ts`): every Storybook story (core matrix: midnight, desktop and phone, English; tag `i18n-wide` adds Swedish, tag `theme-wide` adds all three themes) and every state registered with `visualScreen({ name, route, state })` in `e2e/visual/screens.spec.ts` (core matrix: desktop and phone, midnight, English; `full: true` gives 3 widths x 3 themes x 2 languages and is reserved for a few key screens). Comparison tolerance is `threshold: 0.1`, `maxDiffPixelRatio: 0.002`. **On a PR, Visual is a report, not a gate:** it never fails the PR and you never commit snapshots. It uploads `visual-report-*` artifacts with the diffs and prints a warning when screens differ; look at them if you changed visuals. After merge the workflow `Visual baselines` regenerates the baselines on the CI runner and opens a self-merging PR `bot/visual-baselines` (needs the GitHub App secrets `APP_ID` and `APP_PRIVATE_KEY`; see `docs/architecture.md`). Never commit PNGs made on your own machine; to rebuild everything, run that workflow from the Actions tab. A new screen issue adds its key states in `screens.spec.ts`.
- Mutation testing (Stryker) runs nightly on `engine`. Treat surviving mutants as missing tests.

## i18n

- Typed message keys. English (`en`) is the source locale; `sv` must have every key (a test enforces this).
- Match commentary lives in `src/commentary` as templates per locale with grammar helpers (e.g. Swedish genitive: "Kvarnby" becomes "Kvarnbys", "Västerås" stays "Västerås").

## Persistence

- All saving goes through the `SaveStore` interface. Implementations: in-memory (tests), IndexedDB (browser). Later: Tauri file system.
- Save files are versioned JSON (`schemaVersion`) with migrations and tests for each migration.
- Export/import of a save as a `.json` file must always work.

## Definition of done

- Acceptance criteria in the issue are met and covered by tests.
- Lint, typecheck, depcheck, tests, balance and build are green.
- User-facing strings exist in `en` and `sv`.
- Docs updated if behaviour or architecture changed.
- PR merged and the issue closed via `Closes #n`.
