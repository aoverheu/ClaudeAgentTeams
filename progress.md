# DevKit Course Progress

## Current Status

**Current Lesson:** 8
**Last Updated:** 2026-03-27

---

## History

### Lesson 7 — Completed 2026-03-27

Competing Hypotheses — 4 debugging teammates investigated a planted `!==` inversion bug in todo-tracker. Teammate 3 (filter-investigator) found it precisely; all others self-eliminated their hypotheses. Unanimous consensus, no debate needed. Bug fixed.

**Key insight:** When one hypothesis produces a mechanically precise explanation that matches the exact symptom, the other teammates can self-eliminate without a cross-challenge round — fast convergence is a feature, not a shortcut.

### Lesson 7 — Started 2026-03-27

Competing Hypotheses — debugging a planted bug in todo-tracker. Bug: `!==` instead of `===` in tag filter. Exercise to be run in a new Claude session.

---

### Lesson 6 — Completed 2026-03-27

Multi-Lens Review — 3 reviewers (Security, Performance, Correctness) independently reviewed src/, then cross-challenged each other's findings.

**Final findings:** 0 critical, 3 high, 7 medium, 6 low (16 total across all reviewers)
**Cross-challenge changes:** 5 severity downgrades, 1 upgrade, 4 finding merges (duplicates collapsed)
**Key observations:**
- Different lenses catch different things: security found SSRF, performance found N+1 spawns, correctness found version comparison bug
- Cross-challenge is the most valuable step: both scoped package encoding and binary file issues were independently found by 2 reviewers — the merge produced a sharper combined finding
- SSRF downgraded unanimously: threat model doesn't apply to local CLI, illustrating that security severity depends on deployment context
- Config merge order upgraded by security reviewer: "LOW if you think it's just a bug, MEDIUM if you think users will be confused and trust their CLI flags" — real-world severity depends on UX expectations, not just code

### Lesson 6 — Started 2026-03-26

Multi-Lens Review — 3 reviewer teammates (Security, Performance, Correctness) reviewing the full src/ tree. Exercise to be run in a new Claude session.

---

### Lesson 5 — Completed 2026-03-26

Quality Gates — Code Review as Teammate. 3-teammate team: Config Builder, Formatter Builder, Code Reviewer. Both builders submitted plans (approved), built in parallel, reviewer DMed feedback mid-build which builders addressed. 36 tests passing. Key learning: reviewer caught a severity type mismatch (`high` vs `error`) that would have diverged from the interface contract.

### Lesson 5 — Started 2026-03-26

Quality Gates — Code Review as Teammate. Prepared lesson doc; exercise to be run in a new Claude session.

---

### Lesson 4 — Completed 2026-03-26

Parallel Module Development — 4 teammates building all modules simultaneously.

**Team:** todo-tracker, dep-auditor, git-stats, code-health (parallel build, no dependencies)
**Deliverables:** All 4 modules fully implemented with 52 tests passing
**Key observations:**
- All 4 teammates completed independently with zero file conflicts
- No steering needed — detailed spawn prompts gave sufficient context
- Teammates shared patterns with each other organically (glob tips, mocking approaches)
- Completion order: todo-tracker → git-stats → dep-auditor → code-health
- All CLI commands work end-to-end: table output, JSON output, filtering options
- Broadcast shutdown not supported for structured messages — must send individually

---

### Lesson 3 — Completed 2026-03-26

Project Scaffolding — single session (no team, deliberately).

**Created:** package.json, tsconfig.json, vitest.config.ts, CLI entry point, 4 command files, 4 stub modules, config loader, formatter, smoke tests
**Verified:** `devkit --help` shows all 4 commands, `devkit todo` returns stub output, `devkit todo --json` returns valid JSON, 5/5 tests passing
**Key insight:** Sequential setup work is faster and simpler without a team. The boundary between single session and team work is: scaffolding (sequential) → implementation (parallel).
**Issues fixed:** rootDir required by TS 5.x, Chalk v5 API differs from v4, @types/node needs explicit tsconfig types entry

---

### Lesson 2 — Completed 2026-03-26

Research Team — 3 teammates designed DevKit CLI architecture.

**Team:** CLI Architect, Module Designer, DX Researcher (parallel research → cross-sharing → synthesis)
**Deliverables:** `docs/architecture.md` (final blueprint), `src/shared/types.ts` (module interface contract), `dx-research.md` (DX patterns)
**Key observations:**
- All 3 teammates completed research tasks independently, then shared findings via mailbox
- One design tension surfaced (output rendering ownership) and was resolved by team lead
- Task dependencies worked correctly — share-findings blocked until all research done
- Cross-team communication was organic — teammates messaged each other without prompting
- Total: 5 tasks, 3 parallel research + 1 blocked sharing + 1 blocked synthesis

### Lesson 2 — Started 2026-03-26

Research Team — 3 teammates designing DevKit CLI architecture (CLI Architect, Module Designer, DX Researcher). Expected deliverable: docs/architecture.md.

---

### Lesson 1 — Completed 2026-03-26

Understanding Agent Teams — architecture, when to use teams vs subagents, team lifecycle.

**Observed:** All 5 core mechanics — parallel spawning, independent research, inter-teammate communication via mailbox, self-claiming tasks on dependency resolution, and consensus through direct discussion. No issues. Research-first approach validated as low-risk entry point.

---

### Course Created — 2026-03-26

- Created `plan.md` with 10-lesson deep-dive course structure
- Created `CLAUDE.md` with project instructions and lesson workflow
- Created `progress.md` for tracking
- Stack chosen: TypeScript, Node.js, Commander.js, Chalk, Vitest
- App: DevKit CLI with 4 modules (TODO tracker, dep audit, git stats, code health)
- Course emphasizes progressive complexity: research → build → review → debug → advanced
- Two levels of code review integrated: reviewer-as-teammate and external auditor
