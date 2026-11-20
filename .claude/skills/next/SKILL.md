---
name: next
description: Pick the next piece of work from the GitHub backlog and do it. Develops an agent-ready issue end to end, or, when the next item is an epic or research that is not ready, breaks it down first (decisions, child issues). Names the session after the work. Use when the user says "next", "do next thing" or "what's next".
---

# /next: do whatever is next

The user should only have to say "next". Decide what is next, rename the session, then do it. Argument (optional): an issue number to force the choice (`/next 423`), or `breakdown` to force breakdown mode.

Follow `CLAUDE.md` (workflow, TDD, Conventional Commits, architecture rules) and `AGENTS.md` (CodeScene checks). This skill only decides *what* to work on and *how to start*.

## 1. Survey

1. `gh api repos/johanpearson/Touchline/milestones --jq '.[]|"\(.title)|open \(.open_issues)"'` and `gh api -X GET repos/johanpearson/Touchline/issues --paginate -f state=open -f per_page=100 --jq '.[]|select(.pull_request|not)|"\(.number)|\(.milestone.title // "-")|\([.labels[].name]|join(","))|\(.title)"'`.
2. Open PRs (`mcp__github__list_pull_requests`). An issue that an open PR already closes is **not** next; mention the PR instead. If a PR of ours has failing CI or unanswered review comments, say so and offer to fix it first.
3. Tidy stale epics as you go: an epic whose child issues are all closed gets its checklist ticked and is closed (say so to the user; do not do it silently for epics that still have open questions).

## 2. Choose

Take the first match, in this order:

1. The issue number given as argument.
2. An open, unblocked issue labelled `agent-ready`. Order: lowest milestone first (M5d, M6a, M6b, M7, M8, M9), then `priority:high` > `medium` > `low`, then lowest number. Blocked means the body says "after #n" / "Depends on #n" and #n is open.
3. Otherwise the open epic or research issue in the lowest milestone, not blocked. This is **breakdown mode** (section 4).
4. Nothing left: report that and stop.

Skip `chore(main): release`, dependency bumps and `chore(ci)` issues without `agent-ready`; they are the maintainer's.

State the choice in one or two lines with the reason ("#423: agent-ready, M8, lowest unblocked"), then continue without waiting for approval.

## 3. Rename the session (always, before any work)

Call `mcp__claude-code-remote__set_session_title` (no `session_id` is needed for this session; use the one from `get_session`) with a title in this form:

- Develop: `feat: #423 clean browser history on match lock` (Conventional Commit type, issue number, short plain description, under 60 characters).
- Breakdown: `breakdown: #392 training and fitness`.
- Research: `research: #416 fewer, longer actions`.
- Fixing a PR: `fix-pr: #440 review comments`.

If the plan changes mid-session, rename again.

## 4a. Develop mode (agent-ready issue)

Follow the `CLAUDE.md` workflow: read the issue and its acceptance criteria, read the docs it points to, move it to In Progress, branch `<type>/<n>-<slug>` (in a cloud session use the branch the session was given instead), write the failing test first, implement, run the checks from `CLAUDE.md` and the CodeScene checks from `AGENTS.md`, open the PR with `Closes #n`, enable auto-merge, subscribe to PR activity. If the issue turns out too big for one session, stop, split it (4b step 4) and do the first part.

## 4b. Breakdown mode (epic, research, or an issue that is not agent-ready)

No production code in this mode.

1. Read the epic body, its "Open questions", "Overlaps" and the docs it links. Read the code the questions touch so you can recommend, not just ask.
2. **Decisions first.** For every open question that changes the design, form a recommendation with a one-line reason. Ask the user with `AskUserQuestion` (at most 4 questions per call, recommended option first). Only ask what is genuinely theirs to decide; settle conventional choices yourself and record them. Record the answers in the epic body under a "Decisions" heading (`gh issue edit`).
3. **Research issues:** do the research (read code, run the experiment the issue names), write the design note the acceptance criteria ask for, and open the follow-up issues it calls for.
4. **Child issues.** Create issues that each fit one session, using the repo's feature template, with: acceptance criteria, labels (`type:*`, `area:*`, `priority:*`, `agent-ready`), the epic's milestone, and `Depends on #n` lines for ordering. Add them to the epic's checklist and link them as sub-issues (`mcp__github__sub_issue_write`). Only mark an issue `agent-ready` when its decisions are made and its dependencies are clear. Put anything still undecided in a separate issue without `agent-ready`, and say what blocks it.
5. Commit nothing unless docs changed (then `docs:` commit on the session branch; do not open a PR unless asked).

## 5. Finish

End with a short report: what was done, links (PR, issues created), what is next in the queue (the next result of section 2), and anything that needs the user (decisions, review, merge). Keep it under 10 lines.
