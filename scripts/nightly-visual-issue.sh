#!/usr/bin/env bash
# Opens one issue when the nightly full visual run fails, unless one is still open.
# Usage: GH_TOKEN=... RUN_URL=... nightly-visual-issue.sh <visual.log>
# With DRY_RUN=1 it prints the issue instead of creating it.
set -euo pipefail

log="${1:?path to the visual log}"
title_prefix="ci: nightly visual run failed"
title="$title_prefix ($(date -u +%F))"

if [ "${DRY_RUN:-}" != "1" ]; then
  open=$(gh issue list --state open --label type:bug --label area:ui \
    --search "\"$title_prefix\" in:title" --json number,title \
    --jq "[.[] | select(.title | startswith(\"$title_prefix\"))] | length")
  if [ "$open" != "0" ]; then
    echo "::notice::An issue for a failed nightly visual run is still open; not opening another."
    exit 0
  fi
fi

# The screen states or stories that failed, and the first error lines, without colour codes.
clean=$(sed 's/\x1b\[[0-9;]*m//g' "$log" 2>/dev/null || true)
failed=$(printf '%s\n' "$clean" | grep -E '^ *[0-9]+\) \[visual\]' | sed -E 's/^ *[0-9]+\) //; s/ [─-]+$//' | sort -u | head -40 || true)
errors=$(printf '%s\n' "$clean" | grep -E '(Test timeout|Timeout [0-9]+ms exceeded|^ *Error:)' | sed -E 's/^ +//' | sort | uniq -c | sort -rn | head -15 || true)
[ -n "$failed" ] || failed="No failed test names found in the log; see the run."
[ -n "$errors" ] || errors="No error lines found in the log; see the run."

body=$(printf '## Goal\n\nThe nightly full visual run (`Visual (full)`) failed: a screen state or story is broken (a timeout or an error), or the baselines were not identical between two runs. Find the cause and fix the state or the app. A screenshot that merely differs is not a failure; the baseline pull request takes care of it.\n\n## Failed\n\n```\n%s\n```\n\n## Errors (count, message)\n\n```\n%s\n```\n\n## Run\n\n%s\n\nReproduce a state with `npm run build-storybook` (or `npx storybook build --quiet`), `npx vite build`, then `npx playwright test -c playwright.visual.config.ts -g "<name>"`.\n\n## Acceptance criteria\n\n- [ ] The nightly `Visual (full)` job passes without skipping states or weakening the comparison.\n' "$failed" "$errors" "${RUN_URL:-unknown run}")

if [ "${DRY_RUN:-}" = "1" ]; then
  printf '%s\n\n%s\n' "$title" "$body"
  exit 0
fi

gh issue create --title "$title" --body "$body" \
  --label type:bug --label area:ui --label area:ci --label priority:medium
