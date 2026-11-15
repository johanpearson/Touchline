#!/usr/bin/env bash
# Opens one issue when the nightly full balance suite fails, unless one is still open.
# Usage: GH_TOKEN=... RUN_URL=... nightly-balance-issue.sh <balance.log>
# With DRY_RUN=1 it prints the issue instead of creating it.
set -euo pipefail

log="${1:?path to the balance log}"
title_prefix="ci: nightly balance failed"
title="$title_prefix ($(date -u +%F))"

if [ "${DRY_RUN:-}" != "1" ]; then
  open=$(gh issue list --state open --label type:bug --label area:engine \
    --search "\"$title_prefix\" in:title" --json number,title \
    --jq "[.[] | select(.title | startswith(\"$title_prefix\"))] | length")
  if [ "$open" != "0" ]; then
    echo "::notice::An issue for a failed nightly balance run is still open; not opening another."
    exit 0
  fi
fi

# The failing tests and their assertion messages, without colour codes.
failures=$(sed 's/\x1b\[[0-9;]*m//g' "$log" | grep -E '^ *(FAIL |AssertionError|Error:)' | sort -u | head -60 || true)
[ -n "$failures" ] || failures="No assertion lines found in the log; see the run."

body=$(printf '## Goal\n\nThe nightly full balance suite (`npm run test:balance`) failed. Find the cause and fix the engine or, if the range is wrong, change it deliberately in its own PR.\n\n## Failing assertions\n\n```\n%s\n```\n\n## Run\n\n%s\n\n## Acceptance criteria\n\n- [ ] `npm run test:balance` passes on main without weakening any assertion, range or match count.\n' "$failures" "${RUN_URL:-unknown run}")

if [ "${DRY_RUN:-}" = "1" ]; then
  printf '%s\n\n%s\n' "$title" "$body"
  exit 0
fi

gh issue create --title "$title" --body "$body" \
  --label type:bug --label area:engine --label priority:high
