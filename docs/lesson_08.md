# Lesson 8: Advanced Patterns and Cross-Layer Coordination
**Status:** IN PROGRESS
**Date:** 2026-03-27

## Quick Reference
Use task dependencies to enforce ordering when work has a critical path. A schema designer blocks all implementation; module adapters and the renderer run in parallel once the schema is approved; tests run last. Plan approval on the critical-path task prevents downstream work from starting before the contract is settled. This is the pattern for any feature with a shared data model.

## Concepts
- **What it is** — Structuring a team so that blocked tasks automatically unblock when their dependencies complete. Teammates wait on each other in a defined sequence rather than all starting immediately.
- **Why it exists** — Some work genuinely can't parallelize. When a schema/interface/contract must be agreed on first, you need enforcement — not just convention. Task dependencies make the ordering mechanical, not social.
- **When to use it** — Anytime work has a critical path: schema-first features, migrations, API contracts, anything where downstream work would have to be thrown away if the upstream design changes.
- **When NOT to use it** — When dependencies are loose or could be iterated. Over-specifying dependencies creates unnecessary serialization. If the schema can be revised cheaply after implementation starts, skip the hard block.
- **Common mistakes** — Blocking too many tasks on the same dependency (creates a bottleneck). Not using plan approval on the critical-path task (the schema gets approved without scrutiny). Teammates starting blocked work anyway (check task status before proceeding).

## Key Commands & Syntax
- **Task dependencies** — Set `blockedBy: [taskId]` in task creation; task becomes claimable when all blockers complete
- **Plan approval on critical path** — Use `requirePlanApproval: true` for the schema designer only; only approve plans that define a concrete data model
- **Dependency chain** — Schema → (Module Adapters + Renderer in parallel) → Tests

## Exercise
### Setup
All 4 modules implemented. Shared integration layer built. This lesson adds a new `devkit report` command that aggregates output from all 4 modules into a Markdown report.

### Steps
_To be filled after exercise completes._

### Prompts Used

**Cross-Layer Coordination Team (from plan.md):**
```
Create an agent team to add a unified report feature to devkit.
The project is at C:\Deleteme\Projects\ClaudeAgentTeams.

This has task dependencies:
1. First, a report schema must be designed (blocks everything else)
2. Each module needs a toReportSection() method (can happen in parallel after #1)
3. A report renderer aggregates sections into Markdown (blocked by #2)
4. Tests for the full report pipeline (blocked by #3)

Spawn 4 teammates:
- Teammate 1 (Schema Designer): Design the report data model in
  src/shared/types.ts — add a ReportSection type and a toReportSection()
  method to the Module interface. Once approved, teammates 2 and 3 can start.
  Use plan approval mode. Only start once your plan is approved.

- Teammate 2 (Module Adapter): Add toReportSection() to all 4 modules
  (src/modules/*/index.ts). Depends on teammate 1's schema — do not start
  until teammate 1 signals their task is complete and the schema is merged.

- Teammate 3 (Report Renderer): Build src/commands/report.ts and
  src/modules/report/index.ts — instantiate all 4 modules, call
  toReportSection() on each, assemble into a Markdown report, write to
  devkit-report.md or print to stdout. Depends on teammate 1's schema.

- Teammate 4 (Test Writer): Write tests/unit/report.test.ts and
  tests/integration/report.test.ts. Depends on all others being complete.

Enforce the dependency order. Teammates 2 and 3 must wait for teammate 1.
Teammate 4 must wait for teammates 2 and 3.
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
- **Builds on Lesson 2** — The architecture doc defined the Module interface; this lesson extends it with `toReportSection()`
- **Builds on Lesson 4** — All 4 modules get adapted; each teammate built in Lesson 4 is touched here
- **Sets up Lesson 9** — Integration and polish — wiring everything end-to-end and adding the final review
