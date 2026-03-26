# Lesson 02: Project Scaffolding with a Research Team
**Status:** COMPLETED
**Date:** 2026-03-26 — 2026-03-26

## Quick Reference
Use a 3-teammate research team to design an application's architecture before writing code. This lesson demonstrates spawn prompts with rich context, team sizing (3 teammates), task dependencies, and how to get teammates to build on each other's findings. Research-first is the lowest-risk way to use agent teams because there are no file conflicts and no code to break.

## Concepts
- **What it is** — A research team is an agent team where no code is written. Teammates investigate, design, and produce documentation. The lead synthesizes findings into a final architecture.

- **Why it exists** — Jumping straight into parallel coding without an agreed architecture leads to interface mismatches, duplicated utilities, and wasted effort. A research team aligns the design first, so builders in later lessons have a clear contract to implement against.

- **Spawn prompts** — Teammates don't inherit the lead's conversation history. The spawn prompt is their *only* context. It must include:
  - What the project is and what it does
  - What this specific teammate is responsible for
  - What deliverable they should produce
  - How they should interact with other teammates
  - Any constraints or decisions already made (e.g., "we're using Commander.js" from Lesson 1)

- **Team sizing** — 3 teammates is the sweet spot for research. Each gets a distinct domain (architecture, interfaces, developer experience). More would overlap; fewer wouldn't cover enough ground.

- **Task dependencies** — Tasks can block other tasks. A "synthesize findings" task should be blocked by all individual research tasks, so no one tries to summarize before the research is done.

- **When to use this pattern:**
  - Before building any multi-module project
  - When evaluating technology choices that affect the whole system
  - When multiple people (or agents) need to agree on interfaces before building
  - When exploring a problem space you don't fully understand yet

- **When NOT to use it:**
  - When the architecture is already decided and documented
  - When you're adding a small feature to an existing, well-understood codebase
  - When the research would take longer than just building it

- **Common mistakes:**
  - Spawn prompts too vague — "research the CLI" vs "design the command routing using Commander.js, including subcommand registration and global options"
  - Not telling teammates about prior decisions — they'll waste time re-evaluating things already settled
  - Not asking teammates to share findings — they'll work in silos and produce disconnected designs
  - Too many researchers on overlapping domains — leads to conflicting recommendations

## Key Commands & Syntax

### Spawn prompt structure for research teams
```
Create an agent team to [goal].

Context: [what's already decided, prior findings, constraints]

Spawn [N] research teammates:
- Teammate 1 ([Role]): [Specific domain]. Research [specific questions].
  Produce [specific deliverable].
- Teammate 2 ([Role]): [Specific domain]. Research [specific questions].
  Produce [specific deliverable].
- Teammate 3 ([Role]): [Specific domain]. Research [specific questions].
  Produce [specific deliverable].

Have them share findings with each other and produce [final deliverable].
```

### Incorporating prior decisions
Since Lesson 1 already determined Commander.js is the right framework, the prompt should mention this:
```
We've already decided on Commander.js (zero deps, first-party TS types, right-sized API).
Design around Commander.js patterns — do not re-evaluate the framework choice.
```

### Checking teammate progress
- `Shift+Down` — cycle through teammates
- `Ctrl+T` — toggle task list to see which tasks are in progress/completed
- Message the lead: "What's the status of each teammate?"

## Exercise

### Setup
- Lesson 1 completed: we understand team mechanics and chose Commander.js
- No code exists yet — this is pure design
- Working directory: `C:\Deleteme\Projects\ClaudeAgentTeams`

### Steps
1. Open a separate Claude Code session in the project directory
2. Paste the research team prompt (below)
3. Observe teammates researching and communicating
4. Review the architecture document they produce
5. If teammates miss something, message them directly to redirect
6. Clean up the team when done
7. Bring findings back here to document

### Prompts Used

**Main prompt for the research team:**
```
Create an agent team to design a CLI tool called "devkit" with 4 modules:
1. todo-tracker — scans codebase for TODO/FIXME/HACK comments, reports by file/author/age
2. dep-audit — analyzes package.json dependencies for outdated/deprecated/vulnerable packages
3. git-stats — shows commit frequency, contributor stats, recent activity
4. code-health — reports on file sizes, complexity metrics, test coverage gaps

We've already decided on Commander.js as the CLI framework (zero dependencies,
first-party TypeScript types, right-sized API for our needs). Stack is TypeScript + Node.js,
Chalk for output, Vitest for testing.

Spawn 3 research teammates:
- Teammate 1 (CLI Architect): Design the overall CLI structure using Commander.js,
  command routing, shared config system, and output formatting. Define how the 4
  commands register and share global options (--json, --verbose, --config).

- Teammate 2 (Module Designer): Design the interface/contract each module must
  implement. Define input/output types, error handling patterns, and how modules
  register with the CLI. Ensure all 4 modules can be built independently against
  this contract.

- Teammate 3 (DX Researcher): Research developer experience — output formatting
  (tables vs plain text, JSON mode, colors with Chalk), configuration file format
  (.devkitrc.json), testing strategy with Vitest, and how users will install and
  run the tool.

Have them share findings with each other and produce a final architecture document
saved to docs/architecture.md. The document should include: directory structure,
module interface, CLI command structure, config format, and output formatting spec.
```

Why structured this way:
- Includes the Commander.js decision from Lesson 1 so teammates don't re-evaluate it
- Each teammate has a distinct, non-overlapping domain
- Specific deliverable requested (docs/architecture.md)
- "Share findings with each other" forces inter-teammate communication
- Concrete output formats listed so the DX researcher doesn't go abstract

### Team Output

**Team composition:** 3 teammates running in parallel, coordinated by team lead.

**Teammate 1 — CLI Architect** (completed first alongside Module Designer):
- Designed Commander.js entry point with `register*Command(program)` pattern
- Defined global options: `--json`, `--verbose`, `--no-color`, `--config`, `--target`
- Showed `optsWithGlobals()` for option inheritance to subcommands
- Key insight: don't call `enablePositionalOptions()` so global flags work in any position
- Designed the action handler flow: loadConfig → resolveOutputMode → validate → execute → format

**Teammate 2 — Module Designer** (completed first alongside CLI Architect):
- Wrote full TypeScript interface contract to `src/shared/types.ts`
- Generic `Module<TOptions>` with `execute()` and `validate()` methods
- `ModuleOutput = ModuleResult | ModuleErrorResult` union — modules never throw
- Partial results handled as success + warnings array
- Per-module typed options: `TodoOptions`, `DepAuditOptions`, `GitStatsOptions`, `CodeHealthOptions`
- `ResultItem.meta` as `Record<string, unknown>` for module-specific data

**Teammate 3 — DX Researcher** (completed shortly after):
- Wrote comprehensive DX research doc to `dx-research.md`
- Recommended Chalk + manual padding over cli-table3 for tables
- Three output modes: color/plain/json with `resolveOutputMode()`
- `.devkitrc.json` config with typed schema and override order
- Testing: Vitest + memfs + vi.mock patterns for each module type
- Progress indicators on stderr to keep stdout clean

**Cross-team communication observed:**
- Module Designer and CLI Architect exchanged messages on 3 integration points (targetPath as global option, ModuleOutput handling in action handlers, validate-then-execute pattern)
- All three confirmed alignment after sharing findings
- **One design tension resolved:** DX Researcher suggested modules accept OutputMode/chalk; Module Designer argued for pure-data modules. Team lead decided: modules stay pure (return data, never render). Reasons: testability, consistency, separation of concerns.

**Final synthesis:** Team lead wrote `docs/architecture.md` combining all three designs into a unified blueprint covering directory structure, module interface, CLI commands, config format, output formatting spec, and testing strategy.

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `src/shared/types.ts` | Module interface contract — all TypeScript types | Written by Module Designer; defines the contract all 4 modules implement |
| `dx-research.md` | DX research findings document | Written by DX Researcher; covers output, config, testing, installation |
| `docs/architecture.md` | Final architecture document | Written by team lead; synthesizes all 3 teammates' research into implementation blueprint |

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `progress.md` | Added Lesson 2 start entry | Session tracking per course workflow |
| `docs/README.md` | Added Lesson 2 link | Course index per workflow |

### Decisions Made
1. **Modules are pure data producers** — return structured `ModuleOutput`, never call `console.log` or use chalk. Formatter in CLI layer handles all rendering. (Resolved tension between DX Researcher and Module Designer)
2. **Commander.js register pattern** — each command exports `register*Command(program)` for clean separation
3. **No enablePositionalOptions()** — global flags work before or after subcommand
4. **Config is optional** — missing `.devkitrc.json` silently uses defaults
5. **Explicit module imports** — no plugin system, no dynamic discovery at this scale
6. **Chalk + manual padding for tables** — no extra dependency
7. **Progress on stderr** — stdout stays clean for piping/JSON
8. **Vitest + memfs** — official recommended patterns for filesystem mocking

### Issues Encountered
1. **Stale team from previous session** — had to `TeamDelete` an old `cli-research` team before creating `devkit-research`. Lesson: always clean up teams at end of session.
2. **Output rendering ownership tension** — DX Researcher designed with modules rendering their own output; Module Designer designed pure-data modules. Resolved by team lead decision in favor of pure-data (2-1 consensus). This is a natural outcome of parallel independent research — teammates don't see each other's work until they share findings.

## Connections
- **Previous:** Lesson 1 established Commander.js as the framework and demonstrated basic team mechanics (2 teammates, mailbox, task list)
- **This lesson:** Scales to 3 teammates with distinct roles, introduces spawn prompts with prior context, produces the architecture that Lesson 3-4 will implement
- **Next:** Lesson 3 uses the architecture document from this lesson to scaffold the project in a single session (deliberately NOT a team)
