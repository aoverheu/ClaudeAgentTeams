# Agent Teams Deep Dive: Building a Developer Toolkit CLI

## Overview

An interactive, hands-on course where we build **DevKit** — a CLI tool with independent modules — using Claude Code agent teams. Each lesson introduces new agent team concepts while producing real, working code.

**Stack:** TypeScript + Node.js (Commander.js for CLI, Chalk for output, Vitest for testing)
**App:** `devkit` — a CLI with 4 independent modules: TODO tracker, dependency auditor, git stats, code health reporter

---

## Prerequisites

Before Lesson 1, complete these setup steps:

- [ ] Claude Code v2.1.32+ installed (`claude --version`)
- [ ] Node.js 20+ and npm installed
- [ ] Enable agent teams: add `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"` to your settings.json (or export in shell)
- [ ] Verify: start Claude Code and confirm you can ask it to "create an agent team" without errors

---

## Lesson 1: Understanding Agent Teams (Concept Foundation)

**Goal:** Understand when and why to use agent teams vs subagents vs single sessions.

### 1.1 Concept Briefing

Key architecture:
- **Team lead** — your main Claude Code session, coordinates everything
- **Teammates** — separate Claude Code instances, each with their own context window
- **Task list** — shared work items teammates claim and complete
- **Mailbox** — messaging system for inter-agent communication

When to use what:

| Approach | Best for |
|----------|----------|
| Single session | Sequential tasks, same-file edits, simple work |
| Subagents | Focused tasks where only the result matters, no inter-agent talk needed |
| Agent teams | Parallel exploration, cross-layer coordination, competing hypotheses, research |

### 1.2 Hands-On: Explore the Mechanics

**Exercise:** Ask Claude to create a simple 2-teammate team that researches two different CLI frameworks (Commander.js vs Yargs). Observe:

- [ ] How the team lead spawns teammates
- [ ] How the shared task list appears (Ctrl+T to toggle)
- [ ] How to cycle through teammates (Shift+Down)
- [ ] How teammates report findings back
- [ ] How the lead synthesizes results
- [ ] How to clean up the team when done

**Prompt to use:**
```
Create an agent team with 2 teammates to research CLI frameworks for a new
TypeScript project. One teammate should investigate Commander.js and the other
Yargs. Each should report: API design, TypeScript support, ecosystem/plugins,
and bundle size. Have them compare notes and recommend one.
```

### 1.3 Checkpoint

- [ ] You can identify when agent teams add value vs when they're overhead
- [ ] You've seen the team lifecycle: create → spawn → work → communicate → cleanup
- [ ] You understand the display modes (in-process vs split-pane)

---

## Lesson 2: Project Scaffolding with a Research Team

**Goal:** Use an agent team to research and design the DevKit CLI architecture before writing any code.

### 2.1 Concept Briefing

**Start with research and review** — the docs recommend this for agent teams beginners. Research tasks have clear boundaries, no file conflicts, and low risk. This lesson follows that advice.

Key concepts:
- **Spawn prompts** — give teammates enough context (they don't inherit the lead's conversation history)
- **Team sizing** — 3-5 teammates, 5-6 tasks each
- **Task dependencies** — some tasks block others

### 2.2 Hands-On: Research the Architecture

**Exercise:** Spawn a 3-teammate research team to design DevKit's architecture.

**Prompt to use:**
```
Create an agent team to design a CLI tool called "devkit" with 4 modules:
1. todo-tracker — scans codebase for TODO/FIXME/HACK comments, reports by file/author/age
2. dep-audit — analyzes package.json dependencies for outdated/deprecated/vulnerable packages
3. git-stats — shows commit frequency, contributor stats, recent activity
4. code-health — reports on file sizes, complexity metrics, test coverage gaps

Spawn 3 research teammates:
- Teammate 1 (CLI Architect): Design the overall CLI structure, command routing, shared config system, and output formatting. Research Commander.js patterns for multi-command CLIs.
- Teammate 2 (Module Designer): Design the interface/contract each module must implement. Define input/output types, error handling patterns, and how modules register with the CLI.
- Teammate 3 (DX Researcher): Research developer experience — output formatting (tables, JSON, colors), configuration file format, testing strategy with Vitest, and CI integration.

Have them share findings with each other and produce a final architecture document.
```

### 2.3 Deliverable

- [ ] Architecture document produced by the team
- [ ] Agreed module interface/contract
- [ ] CLI command structure defined
- [ ] You observed teammates communicating and building on each other's findings

### 2.4 Checkpoint

- [ ] You've given teammates specific, context-rich spawn prompts
- [ ] You've seen task dependencies in action
- [ ] You understand why research-first is lower risk than jumping into code

---

## Lesson 3: Scaffolding the Project (Single Session)

**Goal:** Set up the project skeleton in a single session (agent teams would be overkill here).

### 3.1 Concept Briefing

**Not everything needs a team.** This lesson is deliberately a single session to reinforce when teams are overhead. Scaffolding is sequential — each step depends on the previous one.

### 3.2 Hands-On: Bootstrap DevKit

Use a single Claude Code session to:

- [ ] `npm init` and configure `package.json` with TypeScript
- [ ] Install dependencies: `commander`, `chalk`, `glob`, `simple-git`
- [ ] Install dev dependencies: `typescript`, `vitest`, `@types/node`
- [ ] Create `tsconfig.json`
- [ ] Create the directory structure:
  ```
  devkit/
  ├── src/
  │   ├── index.ts          # CLI entry point
  │   ├── commands/          # Command definitions
  │   │   ├── todo.ts
  │   │   ├── deps.ts
  │   │   ├── git-stats.ts
  │   │   └── health.ts
  │   ├── modules/           # Core module logic
  │   │   ├── todo-tracker/
  │   │   ├── dep-audit/
  │   │   ├── git-stats/
  │   │   └── code-health/
  │   ├── shared/            # Shared utilities
  │   │   ├── types.ts       # Module interface contract
  │   │   ├── config.ts      # Configuration loader
  │   │   └── formatter.ts   # Output formatting
  │   └── utils/
  ├── tests/
  ├── package.json
  └── tsconfig.json
  ```
- [ ] Define the core `Module` interface in `types.ts`
- [ ] Wire up the CLI entry point with Commander.js
- [ ] Verify it compiles and `devkit --help` works

### 3.3 Checkpoint

- [ ] `npx devkit --help` shows the 4 commands
- [ ] TypeScript compiles clean
- [ ] You understand why this step was a single session, not a team

---

## Lesson 4: Parallel Module Development (Core Agent Teams)

**Goal:** Build all 4 modules in parallel using an agent team. This is the heart of the course.

### 4.1 Concept Briefing

This is where agent teams shine. Each module:
- Lives in its own directory (no file conflicts)
- Implements the same interface (clear contract)
- Can be built and tested independently

Key concepts:
- **File conflict avoidance** — each teammate owns different files
- **Self-claiming tasks** — teammates pick up work as they finish
- **Monitoring and steering** — check in, redirect if needed

### 4.2 Hands-On: Build the Modules

**Exercise:** Spawn a 4-teammate build team, one per module.

**Prompt to use:**
```
Create an agent team to build 4 independent modules for the devkit CLI.
The project is already scaffolded at the current directory.

Each module must implement the Module interface in src/shared/types.ts.
Each teammate owns ONLY their module directory and their command file.
Do NOT edit shared files — I'll handle integration.

Spawn 4 teammates:

- Teammate 1 (TODO Tracker): Build src/modules/todo-tracker/ and src/commands/todo.ts.
  Scan files for TODO/FIXME/HACK comments using regex. Parse author from git blame.
  Support filtering by file pattern, author, and age. Output as table or JSON.

- Teammate 2 (Dep Auditor): Build src/modules/dep-audit/ and src/commands/deps.ts.
  Read package.json, check npm registry for latest versions, flag outdated/deprecated.
  Support --json output. Handle monorepo (multiple package.json files).

- Teammate 3 (Git Stats): Build src/modules/git-stats/ and src/commands/git-stats.ts.
  Use simple-git to get commit frequency, top contributors, recent activity.
  Support date range filtering. Output as table or JSON.

- Teammate 4 (Code Health): Build src/modules/code-health/ and src/commands/health.ts.
  Report file count, largest files, lines of code per language, files with no tests.
  Support directory filtering. Output as table or JSON.

Each teammate should also write tests in tests/ for their module.
Have 5-6 tasks per teammate. Teammates should message each other if they
discover patterns or utilities that would benefit others.
```

### 4.3 While the Team Works

Practice these team management skills:

- [ ] Use Shift+Down to cycle through teammates and observe their progress
- [ ] Use Ctrl+T to view the shared task list
- [ ] Message a teammate directly to ask about their approach
- [ ] Tell the lead to check on a specific teammate's progress
- [ ] If a teammate is stuck, give them a hint or redirect

### 4.4 Deliverable

- [ ] All 4 modules implemented and passing tests
- [ ] Each module follows the shared interface contract
- [ ] No file conflicts between teammates

### 4.5 Checkpoint

- [ ] You've managed a 4-teammate build team
- [ ] You've communicated with teammates directly
- [ ] You've observed self-claiming behavior on the task list
- [ ] You understand the importance of clear file ownership

---

## Lesson 5: Quality Gates — Code Review as Teammate

**Goal:** Use a reviewer teammate during development and hooks for automated quality enforcement.

### 5.1 Concept Briefing

Two levels of code review with agent teams:

| Level | Mechanism | When |
|-------|-----------|------|
| Reviewer teammate | A teammate whose job is reviewing others' code | During the build — reviews as work completes |
| External auditor | `superpowers:code-reviewer` agent | After a phase — validates against the plan |

Hooks for automated enforcement:
- `TaskCompleted` — runs when a task is marked done; exit code 2 rejects completion
- `TeammateIdle` — runs when a teammate finishes; exit code 2 sends them back to work

### 5.2 Hands-On Part A: Reviewer Teammate

**Exercise:** Spawn a team with 2 builders and 1 reviewer to add the shared integration layer.

**Prompt to use:**
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

### 5.3 Hands-On Part B: Post-Phase Code Review

After the team completes, run the external code reviewer agent:

```
Review the shared integration layer (src/shared/config.ts and src/shared/formatter.ts)
against the architecture from Lesson 2. Check for adherence to the module interface
contract and coding standards.
```

### 5.4 Hands-On Part C: Hooks (Optional Advanced)

Set up a `TaskCompleted` hook that checks if tests exist:

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "command": "bash -c 'if ! grep -r \"test\\|describe\\|it(\" tests/ > /dev/null 2>&1; then echo \"No tests found\" >&2; exit 2; fi'",
        "description": "Ensure tests exist before marking tasks complete"
      }
    ]
  }
}
```

### 5.5 Checkpoint

- [ ] You've used a reviewer teammate alongside builders
- [ ] You've seen plan approval in action (approve/reject cycle)
- [ ] You've run a post-phase code review with the external auditor agent
- [ ] You understand the difference between in-team review and external audit
- [ ] (Optional) You've configured a quality gate hook

---

## Lesson 6: Parallel Code Review with Multiple Lenses

**Goal:** Use an agent team to review the entire codebase from different angles simultaneously.

### 6.1 Concept Briefing

Single reviewers gravitate toward one type of issue. Agent teams let you split review into independent domains that get thorough attention simultaneously. This mirrors the docs' "parallel code review" example.

### 6.2 Hands-On: Multi-Lens Review

**Prompt to use:**
```
Create an agent team to review the entire devkit codebase. Spawn 3 reviewers:

- Teammate 1 (Security Reviewer): Check for command injection risks (we shell out
  to git and npm), path traversal, dependency confusion, unsafe regex (ReDoS),
  and secrets in config handling.

- Teammate 2 (Performance Reviewer): Check for unnecessary file system scans,
  memory usage with large repos, missing caching opportunities, and async/await
  correctness.

- Teammate 3 (Correctness Reviewer): Check for edge cases — empty repos, missing
  package.json, binary files, symlinks, monorepos, Windows path compatibility,
  and error messages that help users fix the problem.

Each reviewer should produce a findings report with severity ratings (critical/high/medium/low).
Have them challenge each other's findings before finalizing.
```

### 6.3 Deliverable

- [ ] Three independent review reports
- [ ] Synthesized findings from the lead
- [ ] Action items prioritized by severity

### 6.4 Checkpoint

- [ ] You've seen how different lenses catch different issues
- [ ] You've observed teammates challenging each other's findings
- [ ] You understand when parallel review is worth the token cost

---

## Lesson 7: Debugging with Competing Hypotheses

**Goal:** Use agent teams to investigate a bug from multiple angles simultaneously.

### 7.1 Concept Briefing

Sequential debugging suffers from **anchoring bias** — once you find one plausible explanation, you stop looking. Agent teams fight this by having teammates investigate different theories in parallel and actively try to disprove each other.

### 7.2 Hands-On: Plant and Hunt a Bug

**Step 1:** I'll introduce a subtle bug into one of the modules (e.g., a race condition in git-stats, an off-by-one in TODO line counting, or a config merge that silently drops values).

**Step 2:** Spawn a debugging team.

**Prompt to use:**
```
Users report that [symptom description].

Spawn 4 agent teammates to investigate different hypotheses:

- Teammate 1: Investigate whether this is a [hypothesis A]
- Teammate 2: Investigate whether this is a [hypothesis B]
- Teammate 3: Investigate whether this is a [hypothesis C]
- Teammate 4: Investigate whether this is a [hypothesis D]

Have them talk to each other to try to disprove each other's theories.
Update findings as consensus emerges. The theory that survives scrutiny
is most likely the actual root cause.
```

### 7.3 Checkpoint

- [ ] You've seen competing hypotheses narrow down to the root cause
- [ ] You've observed the "scientific debate" pattern between teammates
- [ ] You understand why this beats sequential debugging for ambiguous issues

---

## Lesson 8: Advanced Patterns and Cross-Layer Coordination

**Goal:** Handle complex coordination — task dependencies, cross-layer changes, and team steering.

### 8.1 Concept Briefing

Advanced patterns:
- **Task dependencies** — Task B blocked until Task A completes
- **Cross-layer coordination** — Frontend/backend/tests each owned by a teammate
- **Steering** — Redirecting teammates mid-work, waiting for completion, handling drift

### 8.2 Hands-On: Add a New Feature with Dependencies

**Exercise:** Add a `devkit report` command that aggregates output from all 4 modules into a unified report (HTML or Markdown).

**Prompt to use:**
```
Create an agent team to add a unified report feature to devkit.

This has task dependencies:
1. First, a report schema must be designed (blocks everything else)
2. Each module needs a "toReportSection()" method (can happen in parallel after #1)
3. A report renderer aggregates sections into HTML/Markdown (blocked by #2)
4. Tests for the full report pipeline (blocked by #3)

Spawn 4 teammates:
- Teammate 1 (Schema Designer): Design the report data model. Once approved,
  teammates 2 and 3 can start. Use plan approval mode.
- Teammate 2 (Module Adapter): Add toReportSection() to all 4 modules.
  Depends on teammate 1's schema.
- Teammate 3 (Report Renderer): Build the HTML/Markdown renderer.
  Depends on teammate 1's schema and teammate 2's output format.
- Teammate 4 (Test Writer): Write integration tests for the full pipeline.
  Depends on all others.

This is the correct order: Schema → Module Adapters + Renderer → Tests.
Enforce dependencies. Do not let teammates start blocked tasks.
```

### 8.3 Checkpoint

- [ ] You've used task dependencies to enforce ordering
- [ ] You've used plan approval for the critical-path task
- [ ] You've seen how blocked tasks unblock automatically when dependencies complete
- [ ] You've managed a team with cross-cutting concerns

---

## Lesson 9: Polish, Integration, and Final Review

**Goal:** Bring it all together — integrate modules, polish the CLI, and do a final team review.

### 9.1 Hands-On: Integration Team

**Prompt to use:**
```
Create an agent team for final integration and polish of devkit.

Spawn 3 teammates:
- Teammate 1 (Integration): Wire all modules into the CLI entry point.
  Ensure all commands work end-to-end. Fix any interface mismatches.
- Teammate 2 (Polish): Add --help text for every command, consistent
  error messages, a global --verbose flag, and a --version flag.
- Teammate 3 (Testing): Write integration tests that run the full CLI
  commands and verify output. Test error paths.
```

### 9.2 Final Code Review

Run the `superpowers:code-reviewer` agent one final time against the complete plan and codebase.

### 9.3 Deliverable

- [ ] `devkit todo` — scans and reports TODOs
- [ ] `devkit deps` — audits dependencies
- [ ] `devkit git-stats` — shows git statistics
- [ ] `devkit health` — reports code health metrics
- [ ] `devkit report` — generates unified report
- [ ] All commands support `--json` output
- [ ] Integration tests passing
- [ ] Final review clean

---

## Lesson 10: Retrospective and Patterns Reference

**Goal:** Reflect on what we learned and build a reference for future agent team work.

### 10.1 Discussion

- When did agent teams save time vs add overhead?
- Which lessons produced the best team dynamics?
- What team sizes worked best?
- When did you need to steer vs let the team self-organize?
- How did token costs compare across different team configurations?

### 10.2 Agent Teams Cheat Sheet

| Pattern | Team Size | Use When |
|---------|-----------|----------|
| Research | 2-3 | Exploring options, comparing alternatives |
| Parallel Build | 3-5 | Independent modules, clear file ownership |
| Build + Review | N builders + 1 reviewer | Quality matters, new codebase patterns |
| Multi-Lens Review | 3 | Security + Performance + Correctness |
| Competing Hypotheses | 3-5 | Ambiguous bugs, unclear root cause |
| Cross-Layer | 3-4 | Frontend + Backend + Tests |
| Integration | 2-3 | Final assembly, polish, E2E testing |

### 10.3 Common Pitfalls

1. Using teams for sequential work (just use a single session)
2. Teammates editing the same files (define clear ownership)
3. Not giving enough context in spawn prompts (they don't inherit history)
4. Too many teammates (coordination overhead exceeds benefit)
5. Not monitoring progress (drift and wasted effort)
6. Forgetting to clean up teams

---

## Progress Tracker

| Lesson | Status | Key Concept |
|--------|--------|-------------|
| 1. Understanding Agent Teams | [x] | Architecture, when to use |
| 2. Research Team | [x] | Spawn prompts, team sizing |
| 3. Project Scaffolding | [x] | When NOT to use teams |
| 4. Parallel Module Build | [ ] | File ownership, self-claiming |
| 5. Quality Gates | [ ] | Reviewer teammate, plan approval, hooks |
| 6. Multi-Lens Review | [ ] | Parallel review, competing perspectives |
| 7. Competing Hypotheses | [ ] | Debug with adversarial teammates |
| 8. Advanced Patterns | [ ] | Dependencies, cross-layer, steering |
| 9. Integration & Polish | [ ] | Final assembly, E2E review |
| 10. Retrospective | [ ] | Patterns reference, lessons learned |
