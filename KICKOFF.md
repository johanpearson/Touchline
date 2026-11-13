# Kickoff

## 1. Create the repository

```bash
gh repo create touchline --public --clone
cd touchline
# copy the contents of this kickoff package into the repo root (including .github/)
git add -A
git commit -m "chore: kickoff docs, workflows and setup scripts"
git push -u origin main
```

The first push runs CI and deploy workflows that fail because there is no `package.json` yet. That is expected; the first issue fixes it.

## 2. Configure GitHub

```bash
gh auth refresh -s project
./scripts/github-setup.sh
```

Then do the manual steps the script prints (Board and Roadmap views, project workflows).

## 3. Start Claude Code

Open Claude Code in the repo and paste the prompt below.

---

## Alternative: set up from a phone (no terminal)

Use github.com in the phone browser (switch to the desktop site for Settings) and Claude Code cloud sessions (Claude app or claude.ai/code).

1. **Create the repo** on github.com: name `touchline`, Public, tick "Add a README".
2. **Upload the package**: Add file > Upload files > pick `touchline-kickoff.zip` > commit to `main`.
3. **Unpack it with Claude Code**: start a cloud session on the repo with this prompt:
   ```text
   Unpack touchline-kickoff.zip into the repository root: the contents of the touchline-kickoff/ folder go to the root, including .github/, and replace the existing README. Make scripts/*.sh executable, delete the zip, and push. Do nothing else.
   ```
   Merge the resulting branch into `main` (no rules exist yet).
4. **Create the project** first: your profile > Projects > New project (Table), name "Touchline". Add fields Priority (options: High, Medium, Low), Size (S, M, L), Start (date), Target (date). Under Workflows enable:
   - Auto-add to project: repo `touchline`, filter `is:issue,pr is:open`
   - Pull request linked to issue: set Status to In Progress
   - Item closed and Pull request merged: set Status to Done
5. **Create issues**: Actions > "Bootstrap issues" > Run workflow. Labels, milestones and the 23 issues are created and auto-added to the project.
6. **Repo settings** (Settings, desktop site):
   - General > Pull Requests: only "Allow squash merging" (default message: PR title and description), "Allow auto-merge", "Automatically delete head branches".
   - Actions > General > Workflow permissions: "Read and write" and "Allow GitHub Actions to create and approve pull requests" (Release Please).
   - Pages > Source: GitHub Actions.
   - Rules > Rulesets > New branch ruleset "main protection": active, target the default branch, restrict deletions, block force pushes, require linear history, require a pull request (0 approvals), require status checks `Verify`, `Balance`, `E2E smoke`, `PR title`. Status checks can only be selected after they have run once, so add them after the first PR.
7. **Views**: in the project add a Board view (group by Status) and a Roadmap view (Start/Target, group by Milestone).
8. **Start development**: start a cloud session with the prompt above. In cloud sessions `gh` may not be available; the project workflows in step 4 then keep the board in sync as long as every PR says `Closes #<n>`.

---

## Prompt

```text
You are starting development of Touchline, a football management game. This repository contains the vision, architecture, working agreements and a visual prototype of the match view, plus GitHub issues organised in milestones and a GitHub Project.

First, read CLAUDE.md, docs/vision.md, docs/architecture.md and skim reference/match-view-prototype.html (especially the simulation section). Then run `gh issue list --milestone "M0 Foundation"` and `gh project view` to see the plan.

Work through milestone "M0 Foundation" issue by issue, in issue-number order:
1. Pick the next open issue, move it to In Progress in the project, and create a branch named after it.
2. Plan briefly, then work test-first (TDD) until every acceptance criterion is met.
3. Run the full local check (lint, typecheck, depcheck, tests, build) before opening the PR.
4. Open a PR using the template with "Closes #<n>", enable auto-merge (squash), and wait for CI. Fix failures; never weaken checks.
5. When merged, pull main and continue with the next issue.

Rules:
- Follow CLAUDE.md strictly: English everywhere, Conventional Commits, module boundaries, no unseeded randomness in engine or game code.
- If an issue is unclear or too big for one PR, split it into new issues (same milestone, labels, added to the project) and explain in a comment.
- Create issues for any extra work you discover instead of expanding scope.
- Keep everything free and open source.
- If `gh` is not available (cloud session), skip project and PR commands: push the branch and give me the PR title and body (with "Closes #<n>") so I can open the PR. Work one issue per session in that case.

When all M0 issues are closed, stop and give me a short summary: what was built, decisions taken, anything you would change in CLAUDE.md, and the proposed order for M1. Do not start M1 until I confirm.
```
