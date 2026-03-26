# DevKit — Agent Teams Course

## What This Is

A hands-on, 10-lesson deep-dive course learning Claude Code agent teams by building **DevKit** — a Developer Toolkit CLI with independent modules (TODO tracker, dependency auditor, git stats, code health reporter).

## Stack

- TypeScript + Node.js
- Commander.js (CLI framework)
- Chalk (output formatting)
- Vitest (testing)

## Key Files

| File | Purpose |
|------|---------|
| `plan.md` | Master course plan — all 10 lessons, exercises, prompts, checkpoints |
| `progress.md` | Progress log with history — current lesson and timestamped entries |
| `docs/lesson_XX.md` | Per-lesson documentation — self-contained learning reference for each topic |
| `docs/README.md` | Course index — quick-scan table of contents linking to all lesson docs |

## Session Startup

When starting a new session:

1. Read `progress.md` to determine the current lesson and what was last completed
2. Read `plan.md` for the full course structure
3. Read the latest `docs/lesson_XX.md` for current lesson details
4. Resume where we left off — do NOT ask the user to re-explain context

## Lesson Workflow (MUST FOLLOW)

### Before Starting a Lesson

1. Create `docs/lesson_XX.md` using the **Lesson Doc Template** below
2. Update `docs/README.md` index with a link and one-line summary for the new lesson
2. Update `progress.md` with a timestamped entry: `## Lesson X — Started [date]`
3. Confirm with the user before proceeding

### During a Lesson

- Follow the exercises in `plan.md`
- Track any deviations or decisions made
- If the approach changes, note it

### After Completing a Lesson

1. Complete all sections of `docs/lesson_XX.md` using the **Lesson Doc Template** below:
   - Fill in the **Exercise** section with actual prompts used and team output
   - Fill in the **Build Log** section with files created/modified and reasoning
   - Fill in the **Quick Reference** summary
   - Set **Status: COMPLETED** at the top
2. Update `progress.md` with:
   - Timestamped completion entry: `## Lesson X — Completed [date]`
   - Summary of what was accomplished
   - Any notes for future sessions
3. Check off the lesson in `plan.md` progress tracker
4. **Git commit and push** the lesson using the workflow below

## Source Control (MUST FOLLOW)

**Repo:** https://github.com/aoverheu/ClaudeAgentTeams
**Branch:** master

### Per-Lesson Commits

Every lesson gets committed when completed. The commit should include all files created or modified during the lesson.

**Commit message format:**
```
Lesson XX: [Title] — [completed/in-progress]

[1-2 sentence summary of what was accomplished]

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

**Workflow:**
1. After updating lesson doc, progress, and plan — stage all changed files
2. Commit with the format above
3. Push to origin/master

**Rules:**
- Never commit `.env` (contains secrets — already in .gitignore)
- Commit at natural breakpoints: lesson start (doc created), lesson end (doc completed), or significant milestones during longer lessons
- The gh CLI requires `GITHUB_TOKEN` from `.env` to be exported: `export GITHUB_TOKEN=$(grep GITHUB_TOKEN .env | cut -d= -f2)`
- The gh CLI path must be on PATH: `export PATH="/c/Program Files/GitHub CLI:$PATH"`

## Lesson Doc Template

Every `docs/lesson_XX.md` MUST follow this structure. The goal is a **self-contained learning reference** — someone should be able to open any lesson doc months later and fully understand the concept without reading anything else.

```markdown
# Lesson XX: [Title]
**Status:** IN PROGRESS | COMPLETED
**Date:** [date started] — [date completed]

## Quick Reference
One paragraph summary you can scan in 10 seconds to remember what this lesson covers.

## Concepts
- **What it is** — plain-language explanation of the agent team concept
- **Why it exists** — the problem this pattern solves
- **When to use it** — real-world scenarios beyond this project
- **When NOT to use it** — antipatterns and when simpler approaches win
- **Common mistakes** — what goes wrong and how to avoid it

## Key Commands & Syntax
Copy-paste ready prompts, keyboard shortcuts, and config snippets used in this lesson.
Include the exact agent team prompts that worked well — these are the most valuable reference.

## Exercise
### Setup
What we started with before this lesson.

### Steps
What we did, step by step.

### Prompts Used
The exact prompts given to the team lead, with commentary on why they were structured that way.

### Team Output
What the agent team actually produced — summarized results, key decisions teammates made.

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|

### Decisions Made
Architecture/design choices and the reasoning behind them.

### Issues Encountered
What went wrong, how it was resolved, and what to watch out for next time.

## Connections
How this lesson builds on previous lessons and sets up future ones.
```

## Agent Teams Configuration

- Agent teams must be enabled: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json
- Requires Claude Code v2.1.32+
- Default display mode: in-process (Shift+Down to cycle teammates)

## Conventions

- Each agent team teammate owns specific files — no overlapping file edits
- All modules implement the shared `Module` interface in `src/shared/types.ts`
- All commands support `--json` output
- Tests live in `tests/` directory
- Use Vitest for all testing
