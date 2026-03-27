# Lesson 9: Integration & Polish
**Status:** COMPLETED
**Date:** 2026-03-27 — 2026-03-27

## Quick Reference
Final assembly phase — 3 teammates working in parallel on integration, polish, and E2E testing. One fixes interface gaps in the command layer, one improves UX consistency (help text, error handling), and one writes CLI process-level integration tests. All 3 run fully in parallel with zero file conflicts.

## Concepts
- **What it is** — A parallel team doing final integration work: one teammate fixes interface mismatches, one polishes UX consistency, one writes E2E tests.
- **Why it exists** — After parallel module development, integration seams show up: inconsistent option descriptions, missing error handling, untested CLI paths. A dedicated integration phase catches these before shipping.
- **When to use it** — After any parallel build phase before calling something "done." The integration team is cheaper than discovering seams after release.
- **When NOT to use it** — If the team was small and well-coordinated, integration issues may already be minimal. Don't run an integration phase just for ceremony.
- **Common mistakes** — Integration teammate editing files that other teammates are also touching (define clear file ownership). Polisher changing behavior instead of just UX. Not running the actual CLI commands to verify end-to-end.

## Key Commands & Syntax

**Invoke CLI during tests (ESM + tsx):**
```bash
npx tsx src/index.ts <command> --flag
```

**E2E test pattern — spawn actual process:**
```ts
import { spawnSync } from 'node:child_process';

function run(args: string, opts: { cwd?: string } = {}) {
  return spawnSync('npx', ['tsx', 'src/index.ts', ...args.split(/\s+/)], {
    cwd: opts.cwd ?? ROOT,
    shell: true,
    timeout: 30_000,
    encoding: 'utf-8',
  });
}
```

**Extract JSON from output that may have preamble:**
```ts
function extractJson(output: string): unknown {
  const start = output.indexOf('{');
  if (start === -1) {
    const arrStart = output.indexOf('[');
    if (arrStart === -1) throw new Error('No JSON found in output');
    return JSON.parse(output.slice(arrStart));
  }
  return JSON.parse(output.slice(start));
}
```

## Exercise
### Setup
All 5 commands implemented (`todo`, `deps`, `git-stats`, `health`, `report`). 108 unit tests passing. This lesson wires, polishes, and validates end-to-end.

### Steps
1. Created devkit-lesson09 team with 3 tasks
2. Spawned all 3 teammates in parallel — no blocking dependencies
3. All 3 teammates completed independently with zero conflicts
4. Shut down team, updated docs

### Prompts Used

**Integration Team spawn prompt (abbreviated):**
```
Create an agent team for final integration and polish of devkit.
Spawn 3 teammates:
- Teammate 1 (Integration): Wire all modules, fix mismatches. Own: src/index.ts and src/commands/*.ts only.
- Teammate 2 (Polish): Help text, consistent errors, --verbose, --version. Own: src/commands/*.ts only.
- Teammate 3 (Testing): CLI process integration tests. Own: tests/integration/ only.
```

The key structural choice was **clear file ownership with no overlap**: integration and polish both touch `src/commands/*.ts`, but integration focuses on behavior correctness while polish focuses on UX strings — in practice both ended up focusing on `report.ts` from different angles without conflicting.

### Team Output

**integration** (Task #1):
- Built and ran all 5 commands against the live codebase
- Results: todo (203 items), deps (0 — all clean), git-stats (11 items), health (22 items), report --stdout (full markdown, 236 total items)
- Fixed `report.ts`: added `loadConfig()` call (missing vs. all other commands) and replaced inline error handling with `formatError()` for consistency
- Confirmed 120 tests all pass after changes

**polish** (Task #2):
- `report.ts`: added `try/catch` wrapping the full action body; added `createChalk` + `resolveOutputMode` imports; improved `--output` description
- `git-stats.ts`: added example date formats to `--since`/`--until` ("3 months ago", "yesterday"); clarified `--author` mentions "name or email"; `--top-n` shows "(default: all)"
- `health.ts`: rewrote `--max-file-size` and `--max-complexity` descriptions from terse to action-oriented
- `deps.ts`: minor clarity tweak on `--severity`
- Verified `--verbose` passed through correctly in all commands via `optsWithGlobals()`

**testing** (Task #3):
- Created `tests/integration/cli.test.ts` with 12 tests — all passing
- CLI invoked via `npx tsx src/index.ts` using `spawnSync`
- Tests cover: 5 exit-code smoke tests, 4 `--json` valid-JSON tests, 2 `--help` tests, 1 unknown-command error test
- `extractJson()` helper skips non-JSON preamble (deprecation warnings, etc.)
- No bugs surfaced — integration and polish were already clean by the time testing ran

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `tests/integration/cli.test.ts` | 12 CLI process-level integration tests | Validates end-to-end behavior by spawning the actual binary |

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `src/commands/report.ts` | Added `loadConfig()`, `try/catch`, `formatError()`, `createChalk`/`resolveOutputMode` imports, improved `--output` description | report was the only command not following the shared error-handling pattern |
| `src/commands/git-stats.ts` | Added example date formats to `--since`/`--until`, clarified `--author` and `--top-n` descriptions | Improve discoverability via `--help` |
| `src/commands/health.ts` | Rewrote `--max-file-size` and `--max-complexity` option descriptions | Terse originals didn't explain what the flag actually does |
| `src/commands/deps.ts` | Minor `--severity` description tweak | Consistency with other command's option wording |

### Decisions Made
- **report.ts was the main integration seam** — it was built in Lesson 8 as a higher-order command and didn't adopt the shared patterns (loadConfig, formatError, resolveOutputMode). Both the integration and polish teammates independently caught this from different angles (behavior vs. UX), which validated the parallel approach.
- **No `src/index.ts` changes needed** — global `--verbose`, `--version`, `--json`, `--config`, `--target` were already wired correctly from Lesson 3.
- **tsx chosen over ts-node for integration tests** — `npx tsx` was already available as a devDependency and faster to invoke than `ts-node --esm`.

### Issues Encountered
- Node.js v22+ DEP0190 deprecation warning when using `spawnSync` with `shell: true` and array args — informational only, tests unaffected. Could be fixed by joining args to a string instead of splitting.

## Post-Phase Code Review

**Verdict: Not ready for 1.0.** 3 critical, 6 important, 5 minor findings.

### Critical (must fix before 1.0)

| # | Finding |
|---|---------|
| C1 | `report.ts` loads config but never passes it into `generateReport` — custom ignore paths/thresholds are silently ignored. Every other command spreads its config slice into `mergedOptions`. |
| C2 | `git-stats` imports `'fs'` instead of `'node:fs'` — the test mock targets `'fs'` to match, so if the import is corrected the mock silently stops working with no test failure. |
| C3 | `report` command skips `validate()` entirely — bad `--target` produces a partially-rendered report with four error sections instead of a clean upfront error. All other commands validate first. |

### Important (should fix)

| # | Finding |
|---|---------|
| I1 | `dep-audit` reads `registryUrl` via unsafe `Record<string, unknown>` cast — `DepAuditOptions` is missing the field in types. |
| I2 | All commands: `loadConfig` throws on invalid JSON/unknown keys but no command catches it — user sees a raw stack trace. |
| I3 | `smoke.test.ts` makes live network calls to npmjs.org on every test run. |
| I4 | `code-health` coverage detection uses `!== false` semantics — effectively opt-out, contradicts `--check-coverage` being an opt-in flag. |
| I5 | No `--json` integration test for the `report` command. |
| I6 | `docs/architecture.md` and `types.ts` header still say "4 modules" — stale after `report` was added. |

### Minor
- `config` dead variable in `report.ts` (loaded but unused after C1 fix)
- `XXX` tag listed in config defaults but never scanned by `todo-tracker`
- Integration test path splitting is fragile with spaces in paths
- No `.devkitrc.example.json`

### Key Observation
C1 and C3 are both in `report.ts` — the same integration seam the parallel team flagged. The integration and polish teammates fixed the *pattern* (adding `loadConfig`, `formatError`) but not the *wiring* (actually using the loaded config, actually calling `validate()`). The external reviewer caught what the internal team missed because it was looking at behavior against spec, not just code consistency.

## Connections
- **Brings together Lessons 3–8** — every module, command, formatter, and config loader built across the course is exercised here
- **Sets up Lesson 10** — Retrospective and patterns reference — the course culminates with reflection on what worked, what the integration seams revealed, and which patterns to carry forward
