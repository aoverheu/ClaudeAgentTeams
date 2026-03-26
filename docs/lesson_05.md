# Lesson 5: Quality Gates — Code Review as Teammate
**Status:** IN PROGRESS
**Date:** 2026-03-26

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
_To be filled after exercise completes._

### Prompts Used

**Part A — Builder+Reviewer Team (from plan.md):**
```
Create an agent team to build the shared integration layer for devkit.

Spawn 3 teammates:
- Teammate 1 (Config Builder): Build src/shared/config.ts — load .devkitrc.json
  config file, merge with CLI flags, validate config schema. Write tests.

- Teammate 2 (Formatter Builder): Build src/shared/formatter.ts — table output
  with chalk, JSON output mode, summary/detail views. Write tests.

- Teammate 3 (Code Reviewer): Do NOT write code. Your job is to review what
  teammates 1 and 2 produce. Check for: type safety, error handling, consistency
  with the module interface contract, test coverage, edge cases. Send feedback
  directly to the builder teammates. Report final review summary to the lead.

Require plan approval for teammates 1 and 2 before they start implementing.
Only approve plans that include error handling and test coverage.
```

**Part B — Post-Phase Code Review:**
```
Review the shared integration layer (src/shared/config.ts and src/shared/formatter.ts)
against the architecture from Lesson 2. Check for adherence to the module interface
contract and coding standards.
```

**Part C — Hook (Optional):**
See plan.md Lesson 5.4 for the TaskCompleted hook config.

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
- **Builds on Lesson 4** — The modules are built; now we're adding quality controls to the shared layer they all depend on
- **Builds on Lesson 2** — The architecture doc is used as the review baseline
- **Sets up Lesson 6** — Multi-lens review extends the review concept to the full codebase with specialized perspectives
