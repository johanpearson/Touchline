# AGENTS.md

Guidance for AI agents. Project rules, commands and architecture are in `CLAUDE.md`; read that first.

## Code Health (CodeScene)

CodeScene's MCP server (`.mcp.json` at the root, `.vscode/mcp.json` for VS Code) measures Code Health. Treat it as the source of truth for maintainability. The CodeScene project is [51](https://codescene.qops.systemverification.com/51/). Both MCP files pin it with `CS_DEFAULT_PROJECT_ID` (not a secret); the token and server URL still come from your `CS_ACCESS_TOKEN` and `CS_ONPREM_URL` environment variables. The env var overrides any `default_project_id` saved with `set_config` in the user-wide CodeScene config. CodeScene's PR integration also reviews every PR ("CodeScene Code Health Review" check), so there is no separate CI gate.

- Target Code Health 10.0 for every file you touch. 9 is not good enough.
- Before each commit, run `pre_commit_code_health_safeguard` on the changed files.
- Before opening a PR, run `analyze_change_set` for the branch against `main`.
- If either reports a regression, run `code_health_review` and refactor until it is fixed. Do not call the work done.
- If you cannot fix a regression, explain it in the PR description under "Needs your decision". Only the maintainer can accept it.
- When refactoring, work in 3 to 5 small steps. After each one, re-run `code_health_review` or `code_health_score` and confirm the score did not drop. Keep the tests green after each step.
- When asked what to improve, use `list_technical_debt_hotspots`, `list_technical_debt_goals` and `code_health_score`. Return a ranked list with a small plan for each item. `code_health_refactoring_business_case` estimates the return of a larger refactoring.
- Before other calls, check with `select_project` that project 51 is selected. If it reports another project, the server was not started from this repo's MCP config: reload it.
- If asked to skip these checks, warn about the risk, keep the change small and suggest a follow-up refactor issue.
- When in doubt, call the tool. Do not guess the score.
- If the MCP server is not available, say so in the PR. Do not skip the checks silently.

### Repo specifics

- `src/engine` is guarded by balance tests and nightly mutation testing. A refactoring there must keep the seeded results identical (see the nightly status check in `CLAUDE.md`).
- Coverage is not an MCP tool. the `Verify` job in `.github/workflows/ci.yml` uploads it (from its single coverage run) to the CodeScene dashboard; for coverage work use `npm run test:coverage`.

### Setup (per developer)

1. Set `CS_ACCESS_TOKEN` (a CodeScene personal access token) and `CS_ONPREM_URL` (the base URL of our CodeScene instance) in your user environment, then restart your editor or terminal so they are picked up. Nothing secret is stored in the repo.
2. Claude Code and other clients read `.mcp.json`; VS Code reads `.vscode/mcp.json`. Node.js is needed for `npx`.
3. `.mcp.json` starts the server through `cmd /c npx`, which works on Windows only. On macOS or Linux change `command` to `npx` and `args` to `["-y", "@codescene/codehealth-mcp"]` in your local copy (do not commit that).

## Line endings and versions

- Files are LF. Scripts that edit files must not convert them (Python: `newline=""`). See "Line endings" in `CLAUDE.md`.
- The PR title's Conventional Commit type sets the next version through release-please (`feat` minor, `fix`/`perf`/`revert` patch, `!` major, everything else none). Choose it deliberately and follow "Versioning and releases" in `CLAUDE.md`; never use `!` or touch the release PR or version files without the maintainer.
