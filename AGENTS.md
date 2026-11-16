# AGENTS.md

Guidance for AI agents on Code Health. Project rules, commands and architecture are in `CLAUDE.md`; read that first.

The CodeScene MCP server (`codescene` in `.mcp.json`) gives agents Code Health data from our CodeScene on-prem instance. If its tools are not available in your session, say so and carry on with the normal checks; do not guess scores.

## Rules

- **Code Health is the source of truth for maintainability.** Aim for 10.0 on files you touch; do not leave a file worse than you found it.
- **Safeguard every change before you commit:** run `pre_commit_code_health_safeguard` on staged or uncommitted files.
- **Before opening a PR:** run `analyze_change_set` on the branch against `main`. CodeScene also reviews each PR ("CodeScene Code Health Review" check), so fix regressions here instead of waiting for the PR check.
- If either reports a regression, run `code_health_review` on the file, refactor, and re-run. Do not declare a change done while Code Health regresses, unless the PR description names the accepted risk.
- Never bypass or disable a safeguard. If asked to, warn about long-term maintainability, keep the change small and reversible, and note a follow-up issue.

## Refactoring with Code Health

1. Select the project once with `select_codescene_project`.
2. Baseline: `code_health_review` (and `code_health_score`) on the file.
3. Refactor in 3 to 5 small steps, using the findings (complexity, nesting, size, cohesion) as the guide. Keep the tests green after each step (TDD rules in `CLAUDE.md` apply: no behaviour change without a test).
4. Re-run `code_health_review` after each significant step and confirm the score did not drop.

For prioritisation use `list_technical_debt_hotspots`, `list_technical_debt_goals` and `code_health_score`. `code_health_refactoring_business_case` estimates the return of a larger refactoring. Create a GitHub issue for each refactoring that does not fit the current one, as `CLAUDE.md` says.

## Repo specifics

- `src/engine` is the most heavily changed area and is guarded by balance tests and nightly mutation testing. Refactorings there must keep the seeded results identical (see the nightly status check in `CLAUDE.md`).
- **Coverage is not an MCP tool.** The upload (`.github/workflows/codescene-coverage.yml`) only feeds the CodeScene dashboard. For coverage use `npm run test:coverage`.

## Setup (per developer)

1. Install `cs-mcp` (Homebrew, the Windows install script or the release binary; see the CodeScene docs "CodeScene MCP Server").
2. Set `CS_ONPREM_URL` to the base URL of our CodeScene instance in your user environment, then restart your editor or terminal so it is picked up. `.mcp.json` reads it; no secret is stored in the repo.
3. Sign in with the MCP `login` tool. A personal access token in `CS_ACCESS_TOKEN` also works as a fallback, but do not put it in `.mcp.json`.
