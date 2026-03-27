# Lesson 9: Integration & Polish
**Status:** IN PROGRESS
**Date:** 2026-03-27

## Quick Reference
Final assembly phase — 3 teammates working in parallel on integration, polish, and E2E testing, followed by an external code review. This is the "closing the loop" lesson: wiring everything together, ensuring consistent UX across all commands, and validating end-to-end with a reviewer agent.

## Concepts
- **What it is** — A parallel team doing final integration work: one teammate fixes interface mismatches, one polishes UX consistency, one writes E2E tests. Then a post-phase external review validates against the original plan.
- **Why it exists** — After parallel module development, integration seams show up: mismatched option names, inconsistent error messages, missing help text. A dedicated integration phase catches these before shipping.
- **When to use it** — After any parallel build phase before calling something "done." The integration team is cheaper than discovering seams in production.
- **When NOT to use it** — If the team was small and well-coordinated, integration issues may already be resolved. Don't run an integration phase just for ceremony.
- **Common mistakes** — Integration teammate editing files that other teammates are also touching (define clear file ownership even in integration). Polisher changing behavior instead of just UX. Not running the actual CLI commands to verify end-to-end.

## Key Commands & Syntax
- **Post-phase external review** — `superpowers:code-reviewer` agent run after the team completes
- **E2E testing pattern** — Spawn the actual CLI process (not just import modules), capture stdout, assert on output
- **Integration seam check** — Run every command with every flag combination before declaring done

## Exercise
### Setup
All 5 commands implemented (`todo`, `deps`, `git-stats`, `health`, `report`). Tests passing. This lesson wires, polishes, and validates end-to-end.

### Steps
_To be filled after exercise completes._

### Prompts Used

**Integration Team (from plan.md):**
```
Create an agent team for final integration and polish of devkit.
The project is at C:\Deleteme\Projects\ClaudeAgentTeams.

Spawn 3 teammates:

- Teammate 1 (Integration): Wire all modules into the CLI entry point.
  Ensure all 5 commands work end-to-end (todo, deps, git-stats, health, report).
  Fix any interface mismatches — option names that don't match between the
  command layer and the module layer, error codes that aren't handled,
  modules that return unexpected shapes. Run each command and confirm it
  produces output. Own: src/index.ts and src/commands/*.ts only.

- Teammate 2 (Polish): Add --help text for every command (descriptions for
  all options, not just the command itself). Ensure consistent error messages
  across all commands (same format, same tone). Add a global --verbose flag
  that works on all commands. Add a --version flag to the root command.
  Own: src/commands/*.ts only — do NOT change module logic.

- Teammate 3 (Testing): Write integration tests that spawn the actual CLI
  process (using Node's child_process or execa) and verify stdout output.
  Test at least: each command runs without crashing, --json flag produces
  valid JSON on each command, --help flag shows usage, an unknown command
  shows a helpful error. Own: tests/integration/ only.

All 3 teammates can work in parallel — there are no hard dependencies.
```

**Post-phase external review (run after the team completes):**
```
Review the complete devkit CLI against the original architecture from
docs/architecture.md and the course plan. Check:
- All 5 commands present and functional
- Module interface contract (src/shared/types.ts) consistently implemented
- Error handling consistent across commands
- Test coverage adequate for a 1.0 release
```

### Team Output
_To be filled after exercise completes._

## Build Log
### Files Created
_To be filled after exercise completes._

### Files Modified
_To be filled after exercise completes._

### Decisions Made
_To be filled after exercise completes._

### Issues Encountered
_To be filled after exercise completes._

## Connections
- **Builds on Lessons 3–8** — Brings together everything built across all prior lessons
- **Sets up Lesson 10** — Retrospective and patterns reference — the course culminates with reflection on what worked
