# DevKit Course Progress

## Current Status

**Current Lesson:** 2 — Research Team (architecture design)
**Last Updated:** 2026-03-26

---

## History

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
