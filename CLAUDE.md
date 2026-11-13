# CLAUDE.md

Guidance for Claude Code sessions in this repository. Read this file, `docs/vision.md` and `docs/architecture.md` before starting any task.

## Project

**Touchline** (working name) is a single-player football management game in the spirit of Football Manager, with less detail but real depth. Desktop browser first, fictional leagues, clubs and players. Matches are simulated by a deterministic zone-based engine and shown as an animated "momentum terrain" pitch (see `reference/match-view-prototype.html`).

## Commands

```bash
npm ci                  # install
npm run dev             # dev server
npm run lint            # Biome lint + format check
npm run format          # Biome format (write)
npm run typecheck       # tsc --noEmit
npm run depcheck        # dependency-cruiser module boundaries
npm test                # Vitest unit tests
npm run test:coverage   # unit tests with coverage thresholds
npm run test:balance    # engine balance tests (many seeded matches)
npm run test:e2e        # Playwright E2E (smoke: npm run test:e2e:smoke)
npm run build           # production build
```

Before opening a PR, run: `npm run lint && npm run typecheck && npm run depcheck && npm test && npm run build`.

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
- Coverage thresholds are enforced in CI. `engine` and `game` aim for 90%+ lines and branches.
- E2E (Playwright) covers user flows, not logic. Use `data-testid` selectors.
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
