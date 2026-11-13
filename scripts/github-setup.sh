#!/usr/bin/env bash
# One-time GitHub setup for the repository: settings, main ruleset, labels,
# milestones, project and initial issues.
# Requires: gh (logged in with the "project" scope: gh auth refresh -s project), jq.
# Usage: ./scripts/github-setup.sh [owner/repo]
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
OWNER="${REPO%%/*}"
PROJECT_TITLE="${PROJECT_TITLE:-Touchline}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Repository settings for $REPO"
gh repo edit "$REPO" \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --delete-branch-on-merge \
  --enable-auto-merge
gh api -X PATCH "repos/$REPO" \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY >/dev/null
# Let workflows (Release Please) open PRs
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=false >/dev/null
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null || true

echo "==> GitHub Pages (source: GitHub Actions)"
gh api -X POST "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || echo "   Could not enable Pages automatically. Enable it under Settings > Pages (source: GitHub Actions). Free Pages needs a public repo."

echo "==> Ruleset for main"
if gh api "repos/$REPO/rulesets" -q '.[].name' | grep -qx "main protection"; then
  echo "   already exists, skipping"
else
  gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null <<'JSON'
{
  "name": "main protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "Verify" },
          { "context": "Balance" },
          { "context": "E2E smoke" },
          { "context": "PR title" } ] } }
  ]
}
JSON
fi

echo "==> Project"
PROJECT_NUMBER="$(gh project list --owner "$OWNER" --format json -q ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number" | head -n1)"
if [ -z "$PROJECT_NUMBER" ]; then
  PROJECT_NUMBER="$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json -q .number)"
  gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "Priority" --data-type SINGLE_SELECT --single-select-options "High,Medium,Low" >/dev/null
  gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "Size" --data-type SINGLE_SELECT --single-select-options "S,M,L" >/dev/null
  gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "Start" --data-type DATE >/dev/null
  gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "Target" --data-type DATE >/dev/null
  echo "   created project #$PROJECT_NUMBER"
else
  echo "   using existing project #$PROJECT_NUMBER"
fi
gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 || true

echo "==> Labels, milestones and issues"
"$DIR/bootstrap-issues.sh" "$REPO"

echo "==> Adding issues to the project"
gh issue list --repo "$REPO" --state open --limit 500 --json url -q '.[].url' | while read -r url; do
  gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$url" >/dev/null
done

cat <<MSG

Done. Manual steps left (not possible from the CLI):
  1. Open the project (gh project view $PROJECT_NUMBER --owner $OWNER --web):
     - Add a "Board" view grouped by Status.
     - Add a "Roadmap" view using the Start and Target date fields, grouped by Milestone.
     - Workflows: enable "Auto-add to project" for $REPO and "Item closed -> Done".
  2. Settings > Pages: confirm the source is "GitHub Actions".
MSG
