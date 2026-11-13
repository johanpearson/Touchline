#!/usr/bin/env bash
# Creates labels, milestones and the initial issues. Safe to run more than once.
# Works with a plain GITHUB_TOKEN, so it can run from the Bootstrap workflow.
# Usage: ./scripts/bootstrap-issues.sh [owner/repo]
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Labels"
label() { gh label create "$1" --color "$2" --description "$3" --repo "$REPO" --force >/dev/null; }
label "type:feature"   "1f883d" "New capability or behaviour"
label "type:bug"       "d1242f" "Something is broken"
label "type:chore"     "8c959f" "Tooling, setup, maintenance"
label "type:test"      "bf8700" "Tests only"
label "type:docs"      "0969da" "Documentation"
label "epic"           "6639ba" "Large item, break down before starting"
label "agent-ready"    "2da44e" "Clear enough for a Claude Code session"
label "area:engine"    "fb8f44" "Match simulation"
label "area:match-view" "e16f24" "Momentum pitch, match screen"
label "area:game"      "a475f9" "Career, league, squad"
label "area:ui"        "54aeff" "Screens and components"
label "area:i18n"      "4ac26b" "Languages and commentary"
label "area:persistence" "768390" "Saving and loading"
label "area:ci"        "57606a" "CI/CD and repo tooling"
label "area:desktop"   "1b1f24" "Tauri desktop app"
label "priority:high"  "b60205" "Do next"
label "priority:medium" "fbca04" "Soon"
label "priority:low"   "c2e0c6" "Later"

echo "==> Milestones"
milestone() {
  if gh api "repos/$REPO/milestones?state=all" -q '.[].title' | grep -qx "$1"; then
    echo "   $1 exists"
  else
    gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null
    echo "   $1 created"
  fi
}
milestone "M0 Foundation"                "Project skeleton, CI/CD, Pages deploy, i18n and save interface"
milestone "M1 Match engine"              "Deterministic zone-based simulation, stats, balance tests, commentary"
milestone "M2 Match view"                "Momentum terrain match screen driven by the event log"
milestone "M3 League and season"         "Generated fictional league and a full playable season"
milestone "M4 Persistence"               "IndexedDB saves, autosave, export and import"
milestone "M5 Squad and tactics"         "Players, lineup, formation, tactics and substitutions"
milestone "M6 Transfers and development" "Player growth, transfers, contracts and AI clubs"
milestone "M7 Desktop app"               "Tauri packaging with saves on disk"
milestone "M8 Polish and mobile"         "Polish, accessibility and mobile support"

echo "==> Issues"
EXISTING="$(gh issue list --repo "$REPO" --state all --limit 500 --json title -q '.[].title')"
for f in "$DIR"/issues/*.md; do
  title="$(sed -n 's/^title: //p' "$f" | head -n1)"
  labels="$(sed -n 's/^labels: //p' "$f" | head -n1)"
  ms="$(sed -n 's/^milestone: //p' "$f" | head -n1)"
  if printf '%s\n' "$EXISTING" | grep -qxF "$title"; then
    echo "   exists: $title"; continue
  fi
  body="$(awk 'f{print} /^---$/{f=1}' "$f")"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$ms" --body "$body" >/dev/null
  echo "   created: $title"
done

