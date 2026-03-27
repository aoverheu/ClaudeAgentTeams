# Lesson 8: Advanced Patterns and Cross-Layer Coordination
**Status:** COMPLETED
**Date:** 2026-03-27 — 2026-03-27

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
1. Created team `devkit-report` with 4 tasks and dependency chain wired: Task 1 blocks Tasks 2 and 3; Tasks 2 and 3 block Task 4.
2. Spawned all 4 teammates simultaneously. Teammates 2, 3, and 4 checked in immediately and confirmed they were idle/waiting.
3. `schema-designer` submitted a plan (via plain message) for approval. Plan reviewed and approved.
4. `schema-designer` implemented the schema and signaled completion.
5. Team lead manually messaged `module-adapter` and `report-renderer` to unblock them (TaskUpdate dependency resolution doesn't auto-notify idle teammates — they need a message to wake up).
6. `module-adapter` and `report-renderer` ran in parallel.
7. `report-renderer` finished first; team lead waited for `module-adapter`.
8. Once both complete, team lead messaged `test-writer` to unblock Task 4.
9. `test-writer` wrote 20 tests (13 unit + 7 integration) and confirmed all 108 tests pass.
10. Team shut down via individual shutdown_request messages (broadcast doesn't support structured messages).

### Prompts Used

**Team spawn prompt:**
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

**Plan approval message to schema-designer:**
```
Approved. The design is clean and consistent. Proceed with implementation.
Place ReportSectionItem and ReportSection after ResultWarning, and add
toReportSection to the Module interface alongside execute and validate.
```

**Unblock message to module-adapter and report-renderer (after Task 1):**
```
schema-designer has completed Task #1. src/shared/types.ts now has
ReportSectionItem, ReportSection, and toReportSection() on the Module interface.
Read the file and start your task.
```

### Team Output
- **schema-designer** added `ReportSectionItem` (label/value/severity/meta) and `ReportSection` (title/summary/items/metadata) to types.ts, plus `toReportSection()` on the `Module` interface.
- **module-adapter** implemented `toReportSection()` on all 4 modules — each calls `execute()` with default options and formats results into a `ReportSection`. TypeScript compiled cleanly.
- **report-renderer** built `src/modules/report/index.ts` (aggregates all 4 modules, assembles Markdown with header/sections/footer, graceful per-module error handling), `src/commands/report.ts` (`devkit report` with `--output` and `--stdout` flags, `--json` support), and registered the command in `src/index.ts`.
- **test-writer** wrote 13 unit tests (mock all 4 modules, verify assembly, Markdown format, error handling) and 7 integration tests (real git repo temp dir, all 4 section headers, file output). All 108 tests passing.

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `src/commands/report.ts` | `devkit report` command — `--output`, `--stdout`, `--json` flags | CLI entry point for unified report |
| `src/modules/report/index.ts` | Report aggregator — instantiates all 4 modules, calls `toReportSection()`, assembles Markdown with header/sections/footer and graceful per-module error handling | Core report generation logic |
| `tests/unit/report.test.ts` | 13 unit tests — mocks all 4 modules, verifies assembly, Markdown structure, error handling | report-renderer unit coverage |
| `tests/integration/report.test.ts` | 7 integration tests — real git repo temp dir, all 4 section headers present, file output | End-to-end pipeline verification |

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `src/shared/types.ts` | Added `ReportSectionItem`, `ReportSection` types; added `toReportSection()` to `Module` interface | Schema Designer established the contract all other tasks depended on |
| `src/modules/todo-tracker/index.ts` | Implemented `toReportSection()` | Module Adapter phase |
| `src/modules/dep-audit/index.ts` | Implemented `toReportSection()` | Module Adapter phase |
| `src/modules/git-stats/index.ts` | Implemented `toReportSection()` | Module Adapter phase |
| `src/modules/code-health/index.ts` | Implemented `toReportSection()` | Module Adapter phase |
| `src/index.ts` | Registered `devkit report` command | Report Renderer wired the command into the CLI |

### Decisions Made
- **Graceful per-module error handling in the aggregator** — if any module throws, the report still runs for the others and includes an error section rather than crashing. Keeps the report useful even in partial failure scenarios.
- **`--stdout` flag on `devkit report`** — default behavior writes to `devkit-report.md`; `--stdout` prints to terminal. Lets CI pipelines consume the report without creating files.
- **`toReportSection()` calls `execute()` with default options** — modules don't need a separate invocation path; the report is just a formatted wrapper around the existing execution result.
- **Manual unblock messages required** — blocked teammates don't auto-wake when dependencies complete. The lead must message them explicitly. This is a key operational detail of the dependency mechanic.

### Issues Encountered
- **Idle teammates need explicit unblock messages** — when Task 1 completed, Teammates 2 and 3 did not self-start. The lead had to message them with `"schema-designer has completed Task #1... Read the file and start your task."` This is by design (teammates poll their mailbox, not task state), but it means the lead must actively manage the dependency handoff.

## Connections
- **Builds on Lesson 2** — The architecture doc defined the Module interface; this lesson extends it with `toReportSection()`
- **Builds on Lesson 4** — All 4 modules get adapted; each teammate built in Lesson 4 is touched here
- **Sets up Lesson 9** — Integration and polish — wiring everything end-to-end and adding the final review
