# Lesson 03: Project Scaffolding (Single Session)
**Status:** COMPLETED
**Date:** 2026-03-26 — 2026-03-26

## Quick Reference
Not everything needs an agent team. Project scaffolding is sequential — each step depends on the previous one (can't install deps before npm init, can't compile before tsconfig). This lesson uses a single session to reinforce when teams add overhead instead of value. The architecture from Lesson 2 is implemented as a skeleton with stub modules.

## Concepts
- **What it is** — Deliberate use of a single Claude Code session for sequential work, even though we've been using teams. The point is recognizing when teams are overkill.

- **Why it exists** — Agent teams add coordination overhead (token cost, task management, communication). For work where every step depends on the previous one, a single session is faster and simpler.

- **When NOT to use agent teams:**
  - Project initialization (npm init → install deps → create config → scaffold dirs)
  - Sequential file creation where each file imports from the previous one
  - Any work with a strict linear dependency chain
  - Tasks that take less time than team coordination would

- **When this becomes a team task:**
  - Once the skeleton exists and modules can be built independently → Lesson 4
  - The key pivot: scaffolding creates the *interfaces*, teams implement them

- **Common mistakes:**
  - Using teams for everything after learning about them (hammer/nail problem)
  - Underestimating how fast a single session handles sequential work
  - Over-scaffolding — creating too many files with too little content

## Key Commands & Syntax
This lesson is pure single-session work. Key commands:
```bash
npm init -y                     # Initialize package.json
npm install <deps>              # Install production dependencies
npm install -D <devDeps>        # Install dev dependencies
npx tsc --init                  # Generate tsconfig.json (then customize)
npx tsc                         # Compile TypeScript
node dist/index.js --help       # Test the CLI
```

## Exercise

### Setup
- Lesson 2 produced: `docs/architecture.md`, `src/shared/types.ts`
- Architecture defines: directory structure, module interface, CLI commands, config format
- We implement the skeleton here — stub modules, working CLI entry point, shared utilities

### Steps
1. Initialize package.json with TypeScript and ESM configuration
2. Install all dependencies (commander, chalk, glob, simple-git, vitest, etc.)
3. Create tsconfig.json and vitest.config.ts
4. Create directory structure per architecture doc
5. Wire up CLI entry point (src/index.ts) with Commander.js
6. Create stub command files (src/commands/*.ts)
7. Create stub module files (src/modules/*/index.ts)
8. Create shared config loader and formatter stubs
9. Compile and verify `devkit --help` works
10. Run initial test to verify Vitest works

### Prompts Used
_(single session — no team prompts, work done directly in this conversation)_

### Team Output
_(N/A — single session lesson, no team)_

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `package.json` | Project manifest with ESM, bin, scripts | Defines devkit as an ESM package with CLI entry point, build/test/dev scripts |
| `tsconfig.json` | TypeScript compiler config | NodeNext module resolution, strict mode, outputs to dist/ |
| `vitest.config.ts` | Vitest test configuration | Defines test paths, coverage thresholds (80/75/80/80), v8 provider |
| `src/index.ts` | CLI entry point with Commander.js | Registers all 4 commands, defines global options (--json, --verbose, --no-color, --config, --target) |
| `src/commands/todo.ts` | TODO command registration | Wires todo-tracker module to CLI with --author, --tag, --older-than options |
| `src/commands/deps.ts` | Deps command registration | Wires dep-audit module to CLI with --prod-only, --dev-only, --severity options |
| `src/commands/git-stats.ts` | Git stats command registration | Wires git-stats module to CLI with --since, --until, --author, --top-n options |
| `src/commands/health.ts` | Health command registration | Wires code-health module to CLI with --max-file-size, --max-complexity, --check-coverage options |
| `src/modules/todo-tracker/index.ts` | TODO tracker stub module | Implements Module<TodoOptions> interface with placeholder returning empty results |
| `src/modules/dep-audit/index.ts` | Dep audit stub module | Implements Module<DepAuditOptions> interface with placeholder returning empty results |
| `src/modules/git-stats/index.ts` | Git stats stub module | Implements Module<GitStatsOptions> interface with placeholder returning empty results |
| `src/modules/code-health/index.ts` | Code health stub module | Implements Module<CodeHealthOptions> interface with placeholder returning empty results |
| `src/shared/config.ts` | Configuration loader | Loads .devkitrc.json with deep merge over defaults, missing config silently uses defaults |
| `src/shared/formatter.ts` | Output formatter | Resolves output mode (color/plain/json), formats tables with chalk, handles error display |
| `tests/unit/smoke.test.ts` | Smoke tests for all 4 modules | Verifies all stubs return valid ModuleOutput and validate without errors |

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `src/shared/types.ts` | No changes | Already created in Lesson 2 — used as-is |

### Decisions Made
1. **Added `rootDir: "src"` to tsconfig.json** — TypeScript 5.x requires explicit rootDir when outDir is set and all sources are in a subdirectory
2. **Chalk v5 uses `new Chalk()` constructor** — not `new chalk.Instance()` as in v4. Architecture doc had v4 pattern; updated to match actual installed version (5.6.2)
3. **deepMerge uses `Record<string, unknown>`** — simpler type than generic approach, avoids complex type gymnastics for a utility function
4. **Stub modules return "not yet implemented" warning** — stubs are functional (return valid ModuleOutput) so the CLI works end-to-end, with a clear marker for Lesson 4

### Issues Encountered
1. **TypeScript compilation error: `rootDir` required** — TS 5.x stricter about rootDir inference. Fixed by adding explicit `rootDir: "src"` to tsconfig.json
2. **Chalk v5 API mismatch** — Architecture doc referenced `chalk.Instance` (v4 API). Chalk v5 exports `Chalk` as the constructor class. Fixed by importing `{ Chalk }` directly
3. **`@types/node` not found** — needed `types: ["node"]` in tsconfig.json for `process` and `node:fs/promises` to resolve

## Connections
- **Previous:** Lesson 2 produced the architecture doc and types.ts that we're implementing here
- **This lesson:** Creates the skeleton that Lesson 4's agent team will fill with real module implementations
- **Next:** Lesson 4 spawns 4 teammates, one per module, to build against these stubs
- **Key insight:** Scaffolding (sequential) → Implementation (parallel) is the natural boundary between single sessions and agent teams
