# Lesson 5: Quality Gates — Code Review as Teammate
**Status:** COMPLETED
**Date:** 2026-03-26 — 2026-03-26

## Quick Reference
Use a reviewer teammate during development to check code as it's produced, plus post-phase external audit. Three parts: (A) spawn a team with 2 builders + 1 reviewer to build the shared integration layer, (B) run the external code-reviewer agent, (C) optionally configure a TaskCompleted hook for automated quality enforcement. Key concepts: plan approval, reviewer-as-teammate, in-team review vs external audit.

## Concepts
- **What it is** — Two levels of code review integrated into agent team workflows: a reviewer teammate who reviews during the build (catching issues early), and an external auditor agent that validates after a phase completes (catching systemic issues).
- **Why it exists** — Code review after the fact misses design-level issues. A reviewer teammate participates in real-time, seeing work as it's produced. The external auditor provides a second opinion from outside the team's context.
- **When to use it** — When quality matters more than speed: new patterns being established, unfamiliar codebase areas, security-sensitive code, or shared infrastructure that other code depends on.
- **When NOT to use it** — Simple, well-understood changes where review overhead exceeds benefit. Trivial bug fixes. Code that's already covered by comprehensive tests.
- **Common mistakes** — Making the reviewer too strict (blocks all progress), not giving the reviewer enough context about the interface contract, having the reviewer also write code (role confusion), not using plan approval for critical-path tasks.

## Key Commands & Syntax
- **Plan approval** — Teammates submit plans before implementing; lead approves or rejects with feedback
- **Reviewer teammate prompt pattern** — "Do NOT write code. Your job is to review..."
- **External auditor** — `superpowers:code-reviewer` agent run after the phase
- **TaskCompleted hook** — Hook in settings.json that runs when tasks are marked done; exit code 2 rejects

## Exercise
### Setup
All 4 modules implemented in Lesson 4. Shared files (`src/shared/config.ts` and `src/shared/formatter.ts`) have basic implementations from Lesson 3 scaffolding. This lesson enhances them with a builder+reviewer team.

### Steps
1. Spawned 3-teammate team: Config Builder, Formatter Builder, Code Reviewer
2. Both builders submitted plans; plans were approved (included error handling + test coverage)
3. Builders implemented in parallel; Reviewer DMed feedback mid-build
4. Builders addressed reviewer feedback and completed
5. Reviewer reported final summary to lead
6. All 36 tests pass

### Prompts Used

**Part A — Builder+Reviewer Team:**
```
Create an agent team to build the shared integration layer for devkit.

The project is at C:\Deleteme\Projects\ClaudeAgentTeams. Read src/shared/config.ts
and src/shared/formatter.ts — these are stubs that need to be fully built out.
Also read src/shared/types.ts to understand the module interface contract.

Spawn 3 teammates:

- Teammate 1 (Config Builder): Enhance src/shared/config.ts to:
  (1) load .devkitrc.json config file (already done — keep it)
  (2) merge config values with CLI flag overrides passed at runtime
  (3) validate config schema — reject unknown keys and wrong types with helpful error messages
  Write tests in tests/unit/config.test.ts covering: missing file uses defaults,
  valid config merges correctly, CLI flags override file values, invalid schema throws
  with a useful message.

- Teammate 2 (Formatter Builder): Enhance src/shared/formatter.ts to:
  (1) keep the existing table/JSON/error formatting (already done — keep it)
  (2) add a summary view: just the module name, count, and status (no item details)
  (3) add severity-based coloring in table rows (critical=red, high=yellow, medium=blue, low=dim)
  (4) add a formatSummaryLine() export for use in the unified report later
  Write tests in tests/unit/formatter.test.ts covering: JSON mode, table mode,
  summary mode, severity colors (check ANSI codes present/absent), error formatting.

- Teammate 3 (Code Reviewer): Do NOT write code. Your job is to review what
  teammates 1 and 2 produce. Check for:
  - Type safety (no 'any', proper error types)
  - Error handling (file not found, malformed JSON, wrong types)
  - Consistency with the module interface contract in src/shared/types.ts
  - Test coverage (are edge cases tested?)
  - Edge cases teammates may have missed
  Send feedback directly to the builder teammates via DM. Report final review
  summary to the lead when both builders are done.

Require plan approval for teammates 1 and 2 before they start implementing.
Only approve plans that include error handling AND test coverage.
```

### Team Output
- **Config Builder** added `validateConfig()` (rejects unknown keys, wrong types), `mergeWithCliFlags()` (deep-merge), and hardened `loadConfig()` with `existsSync` guard before read attempt. 20 tests.
- **Formatter Builder** added `formatSummaryLine()` export, `summary` option on `FormatOptions`, severity-based row colorizer via `rowColorizer` callback on `formatTable`. 16 tests.
- **Code Reviewer** sent DM feedback to both builders (mid-build) then reported clean bill of health to lead — no remaining issues after builders addressed the feedback.

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `tests/unit/config.test.ts` | 20 tests for loadConfig, mergeWithCliFlags, validateConfig | Config Builder wrote alongside implementation |
| `tests/unit/formatter.test.ts` | 16 tests covering JSON, table, summary, severity colors, error paths | Formatter Builder wrote alongside implementation |

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `src/shared/config.ts` | Added `validateConfig()`, `mergeWithCliFlags()`, hardened `loadConfig()` with existsSync guard | Config Builder enhancements per exercise spec |
| `src/shared/formatter.ts` | Added `formatSummaryLine()`, `summary` option, severity-based row colorizer, `rowColorizer` callback on `formatTable` | Formatter Builder enhancements per exercise spec |

### Decisions Made
- **`rowColorizer` callback on `formatTable`** — rather than embedding severity logic in `formatTable`, the formatter passes a row-level colorizer function. Keeps the table renderer generic while allowing callers to apply any coloring logic.
- **`existsSync` guard in `loadConfig`** — reviewer flagged that the original catch-all `try/catch` masked the difference between "file doesn't exist" and "file has bad content". The fix: check existence first, return defaults if missing, only then attempt parse+validate so errors are about bad content only.
- **`severityColor` map uses `error` key (not `high`)** — matched to the `Severity` type (`critical | error | warning | info`) in `src/shared/types.ts`. The spec said "high=yellow" but the actual type doesn't have a `high` severity; the reviewer caught this and the formatter builder corrected it.

### Issues Encountered
- **Severity type mismatch** — exercise prompt said "critical=red, high=yellow, medium=blue, low=dim" but the types use `critical | error | warning | info`. Reviewer caught this and corrected it to match the interface contract.

## Connections
- **Builds on Lesson 4** — The modules are built; now we're adding quality controls to the shared layer they all depend on
- **Builds on Lesson 2** — The architecture doc is used as the review baseline
- **Sets up Lesson 6** — Multi-lens review extends the review concept to the full codebase with specialized perspectives
