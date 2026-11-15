#!/usr/bin/env bash
# Commits the files of a directory (status.json and badge-*.json) to the orphan branch `nightly-status`.
# It never touches `main`. The branch is created on the first run and then only receives new commits.
# Usage: GITHUB_REPOSITORY=... GITHUB_TOKEN=... publish-nightly-status.sh <dir>
# With DRY_RUN=1 it only shows what it would commit.
set -euo pipefail

dir="$(cd "${1:?directory with the files to publish}" && pwd)"
branch="nightly-status"
repo="${GITHUB_REPOSITORY:?}"
work="$(mktemp -d)"

cd "$work"
git init -q
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git remote add origin "https://x-access-token:${GITHUB_TOKEN:-none}@github.com/${repo}.git"

if git fetch -q --depth=1 origin "$branch" 2>/dev/null; then
  git checkout -q -B "$branch" FETCH_HEAD
else
  git checkout -q --orphan "$branch"
fi

find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp "$dir"/*.json .
git add -A

if git diff --cached --quiet; then
  echo "Nothing changed; not committing."
  exit 0
fi

git commit -q -m "chore(ci): nightly status $(date -u +%F)"
if [ "${DRY_RUN:-}" = "1" ]; then
  git show --stat --format=%s HEAD
  exit 0
fi
git push origin "HEAD:refs/heads/$branch"
