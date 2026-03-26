# Lesson 4: Parallel Module Development (Core Agent Teams)
**Status:** COMPLETED
**Date:** 2026-03-26 — 2026-03-26

## Quick Reference
Build all 4 DevKit modules in parallel using a 4-teammate agent team — one teammate per module. This is the core agent teams use case: independent work units with clear file ownership, no overlapping edits, and the same interface contract. Key skills: file ownership, self-claiming tasks, monitoring teammates, and steering when needed.

## Concepts
- **What it is** — A parallel build pattern where each teammate owns an independent module directory and its corresponding command file. All teammates implement the same `Module` interface contract, so their work is structurally consistent without coordination.
- **Why it exists** — Building 4 independent modules sequentially would take ~4x the wall-clock time. Since each module lives in its own directory and follows the same interface, there's no reason to serialize the work.
- **When to use it** — Any time you have N independent work units with clear file boundaries: microservices, feature modules, API endpoints, data pipelines, etc.
- **When NOT to use it** — When modules share files, when work is sequential (each step depends on the previous), or when the interface contract isn't settled yet.
- **Common mistakes** — Letting teammates edit shared files (causes conflicts), not giving enough context in spawn prompts (teammates don't inherit lead's history), using too many teammates (coordination overhead exceeds benefit).

## Key Commands & Syntax
- **Shift+Down** — Cycle through teammates to observe progress
- **Ctrl+T** — Toggle shared task list view
- **Message a teammate** — Send direct message to check on approach or redirect
- **Plan approval** — Not used this lesson (teammates have clear specs)

## Exercise
### Setup
Project scaffolded in Lesson 3 with:
- CLI entry point (`src/index.ts`) wired to Commander.js
- 4 command files (`src/commands/{todo,deps,git-stats,health}.ts`) already registered
- 4 module stubs (`src/modules/{todo-tracker,dep-audit,git-stats,code-health}/index.ts`) returning placeholder results
- Shared types (`src/shared/types.ts`) with full `Module` interface contract
- All stubs compile and `devkit --help` shows all 4 commands

### Steps
1. Created `devkit-build` team with TeamCreate
2. Created 4 tasks on the shared task list (one per module)
3. Spawned 4 teammates in parallel, each with a detailed prompt containing: project context, file ownership boundaries, Module interface contract, specific implementation requirements, test expectations, and available dependencies
4. All 4 teammates worked independently — no file conflicts, no coordination needed
5. Teammates completed in order: todo-tracker, git-stats, dep-auditor, code-health
6. Teammates shared pattern notes with each other (e.g., glob usage tips, simple-git mocking approach)
7. Ran full test suite: 52 tests passing across 5 test files
8. Smoke-tested all 4 CLI commands end-to-end (table + JSON output modes)
9. Shut down all teammates

### Prompts Used
Each teammate received a ~600-word prompt with these sections:
- **Project context** — stack, file locations, ES module conventions
- **File ownership** — explicit list of files they can edit, plus "Do NOT edit shared files"
- **Module interface contract** — full TypeScript types they need to implement
- **What to build** — validate(), execute(), and tests with specific requirements
- **Existing code patterns** — import conventions, `.js` extensions, how the command file already handles config/formatting
- **Dependencies available** — what npm packages they can use
- **After implementation** — run tests, mark task complete, share patterns with teammates

Key prompt design choices:
- Included the full interface types inline rather than saying "read types.ts" — avoids teammates spending tokens reading files they don't need to modify
- Specified error codes per module (e.g., dep-audit gets NO_PACKAGE_JSON, git-stats gets NOT_A_GIT_REPO)
- Told them NOT to edit shared files (the #1 risk with parallel builds)
- Included the testing framework and patterns from existing smoke tests

### Team Output
| Teammate | Module | Tests | Key Implementation Details |
|----------|--------|-------|---------------------------|
| todo-tracker | TODO/FIXME/HACK scanner | 12 tests | Regex scanning, glob file discovery, severity mapping (TODO=info, FIXME/HACK=warning), git blame optional |
| dep-auditor | Dependency auditor | 14 tests | npm registry fetch, semver comparison (patch=info, minor=warning, major=error, deprecated=critical), graceful network error handling |
| git-stats | Git statistics | 10 tests | simple-git log, top N contributors, commit frequency, most active files, date range filtering |
| code-health | Code health reporter | 9 tests | File/line counting by language, large file detection, cyclomatic complexity proxy, test coverage gap detection |

Total: **52 tests passing** (45 new + 5 existing smoke + 2 additional)

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `tests/unit/todo-tracker.test.ts` | 12 tests for TODO scanner | Validates scanning, filtering, severity mapping, exclusions, validation |
| `tests/unit/dep-audit.test.ts` | 14 tests for dependency auditor | Validates version comparison, severity classification, filtering, network errors |
| `tests/unit/git-stats.test.ts` | 10 tests for git statistics | Validates commit parsing, contributor stats, filtering, empty repo handling |
| `tests/unit/code-health.test.ts` | 9 tests for code health reporter | Validates file counting, large file detection, complexity, test gaps |

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `src/modules/todo-tracker/index.ts` | Stub replaced with full implementation | Scan files for TODO/FIXME/HACK comments |
| `src/modules/dep-audit/index.ts` | Stub replaced with full implementation | Audit package.json against npm registry |
| `src/modules/git-stats/index.ts` | Stub replaced with full implementation | Git commit statistics via simple-git |
| `src/modules/code-health/index.ts` | Stub replaced with full implementation | File metrics, complexity, test coverage gaps |

### Decisions Made
- **No command file changes needed** — The existing command files from Lesson 3 already handled config merging, validation, and output formatting correctly. Teammates only needed to implement the module logic.
- **Detailed spawn prompts over plan approval** — Since the interface contract was well-defined, gave each teammate a detailed spec rather than requiring plan approval. This let them start immediately without an approve/reject cycle.
- **4 tasks, 1 per teammate** — Kept it simple with one task per teammate rather than 5-6 sub-tasks each. The modules are self-contained enough that breaking them down further would just add overhead.
- **Pattern sharing via teammate messages** — Teammates shared useful patterns (glob config, simple-git mocking) which demonstrates organic inter-teammate communication.

### Issues Encountered
- **No file conflicts** — Clean separation worked perfectly. Each teammate stayed in their lane.
- **No steering needed** — All teammates completed autonomously without intervention. The detailed prompts gave enough context.
- **Broadcast shutdown limitation** — Structured JSON messages (shutdown_request) can't be broadcast to all teammates; had to send individually to each.

## Connections
- **Builds on Lesson 2** — The architecture and module interface designed by the research team is now being implemented
- **Builds on Lesson 3** — The scaffolding (stubs, commands, types) provides the skeleton each teammate fills in
- **Sets up Lesson 5** — The completed modules will be reviewed by a reviewer teammate (quality gates)
- **Sets up Lesson 6** — The full codebase will get multi-lens review (security, performance, correctness)
