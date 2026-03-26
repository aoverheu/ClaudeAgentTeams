# DevKit Architecture

> Final architecture document produced by a 3-teammate research team (Lesson 2).
> This is the blueprint for implementation in Lessons 3-4.

---

## Directory Structure

```
devkit/
├── src/
│   ├── index.ts              # CLI entry point (shebang, Commander.js setup)
│   ├── commands/             # Command registration (one file per module)
│   │   ├── todo.ts
│   │   ├── deps.ts
│   │   ├── git-stats.ts
│   │   └── health.ts
│   ├── modules/              # Core module logic (pure data, no rendering)
│   │   ├── todo-tracker/
│   │   │   └── index.ts
│   │   ├── dep-audit/
│   │   │   └── index.ts
│   │   ├── git-stats/
│   │   │   └── index.ts
│   │   └── code-health/
│   │       └── index.ts
│   └── shared/               # Shared utilities
│       ├── types.ts          # Module interface contract (already written)
│       ├── config.ts         # Configuration loader
│       └── formatter.ts      # Output formatting (table, JSON, plain)
├── tests/
│   ├── unit/                 # Per-module unit tests (memfs, vi.mock)
│   │   ├── todo.test.ts
│   │   ├── dep-audit.test.ts
│   │   ├── git-stats.test.ts
│   │   ├── code-health.test.ts
│   │   ├── config.test.ts
│   │   └── formatter.test.ts
│   ├── integration/          # Full CLI tests (spawn process, check stdout)
│   │   └── cli.test.ts
│   └── fixtures/             # Test data
│       └── sample-project/
├── .devkitrc.json            # Example config (not shipped, for development)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Module Interface Contract

All 4 modules implement the `Module<TOptions>` interface defined in `src/shared/types.ts`.

### Core Interface

```typescript
interface Module<TOptions extends ModuleOptions = ModuleOptions> {
  name: string;                                    // CLI subcommand name
  description: string;                             // --help text
  execute(options: TOptions): Promise<ModuleOutput>; // Main logic
  validate(options: TOptions): Promise<ModuleError | null>; // Pre-flight check
}
```

### Key Types

| Type | Purpose |
|------|---------|
| `GlobalOptions` | Shared CLI flags: `targetPath`, `json`, `verbose` |
| `ModuleOptions` | Extends `GlobalOptions` with index signature for per-module options |
| `TodoOptions`, `DepAuditOptions`, `GitStatsOptions`, `CodeHealthOptions` | Per-module typed options |
| `ModuleResult` | Success: `summary` + `items` + `warnings` + `durationMs` |
| `ModuleErrorResult` | Failure: `error` with code, message, suggestion |
| `ModuleOutput` | Union: `ModuleResult | ModuleErrorResult` |
| `ResultItem` | Single finding: `file`, `line`, `severity`, `message`, `meta` |

### Design Principles

1. **Modules are pure data producers** — they return structured `ModuleOutput`, never call `console.log` or use chalk
2. **Never throw** — all errors caught and returned as `ModuleErrorResult`
3. **Partial results are success + warnings** — e.g., 95 files scanned, 5 unreadable
4. **Total failure returns `ModuleErrorResult`** — e.g., target path doesn't exist
5. **`validate()` before `execute()`** — fail fast with actionable suggestions

### Error Codes

```typescript
enum ModuleErrorCode {
  TARGET_NOT_FOUND    // path doesn't exist
  NOT_A_GIT_REPO      // for git-dependent modules
  NO_PACKAGE_JSON     // for dep-audit
  TOOL_NOT_FOUND      // required tool not installed
  PERMISSION_DENIED   // can't read files
  INTERNAL_ERROR      // unexpected failure
}
```

### Module Registration

Explicit imports — each module is a default export from `src/modules/{name}/index.ts`. The CLI entry point imports all 4 and registers them. No plugin system needed at this scale.

---

## CLI Command Structure

### Entry Point (`src/index.ts`)

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { registerTodoCommand } from './commands/todo.js';
import { registerDepsCommand } from './commands/deps.js';
import { registerGitStatsCommand } from './commands/git-stats.js';
import { registerHealthCommand } from './commands/health.js';

const program = new Command();

program
  .name('devkit')
  .description('Developer Toolkit CLI')
  .version('0.1.0');

// Global options — inherited by all subcommands via optsWithGlobals()
program
  .option('--json', 'Output results as JSON', false)
  .option('--verbose', 'Show detailed output', false)
  .option('--no-color', 'Disable colored output')
  .option('--config <path>', 'Path to config file', '.devkitrc.json')
  .option('-t, --target <path>', 'Target directory to analyze', process.cwd());

registerTodoCommand(program);
registerDepsCommand(program);
registerGitStatsCommand(program);
registerHealthCommand(program);

program.parse();
```

### Command Registration Pattern

Each command file exports a `register*Command(program)` function:

```typescript
// src/commands/todo.ts
import { Command } from 'commander';
import todoTracker from '../modules/todo-tracker/index.js';
import { loadConfig } from '../shared/config.js';
import { formatOutput, formatError, resolveOutputMode, createChalk } from '../shared/formatter.js';

export function registerTodoCommand(program: Command): void {
  program
    .command('todo')
    .description('Scan codebase for TODO/FIXME/HACK comments')
    .option('-a, --author <name>', 'Filter by author')
    .option('--tag <type>', 'Filter by tag: TODO, FIXME, HACK', 'all')
    .option('--older-than <days>', 'Filter TODOs older than N days', parseInt)
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();
      const config = await loadConfig(globalOpts.config);
      const outputMode = resolveOutputMode(globalOpts);
      const chalk = createChalk(outputMode);

      const mergedOptions = {
        targetPath: globalOpts.target,
        json: globalOpts.json,
        verbose: globalOpts.verbose,
        ...config.todo,
        ...options,  // CLI flags override config
      };

      const validationError = await todoTracker.validate(mergedOptions);
      if (validationError) {
        formatError(validationError, chalk);
        process.exit(1);
      }

      const result = await todoTracker.execute(mergedOptions);
      formatOutput(result, { outputMode, verbose: globalOpts.verbose, chalk });
    });
}
```

### Full Command Reference

```
devkit [global options] <command> [command options]

Global options:
  --json              Output as JSON (full dataset)
  --verbose           Show detailed output (all items vs summary)
  --no-color          Disable colored output
  --config <path>     Config file path (default: .devkitrc.json)
  -t, --target <path> Target directory (default: cwd)
  -V, --version       Show version
  -h, --help          Show help

Commands:
  todo                Scan for TODO/FIXME/HACK comments
    -a, --author        Filter by author (git blame)
    --tag <type>        Filter by tag: TODO, FIXME, HACK (default: all)
    --older-than <days> Filter TODOs older than N days

  deps                Audit package.json dependencies
    --prod-only         Check only production dependencies
    --dev-only          Check only dev dependencies
    --severity <level>  Minimum severity: low, moderate, high, critical

  git-stats           Show git commit statistics
    --since <date>      Start date for analysis
    --until <date>      End date for analysis
    --author <name>     Filter by author
    --top-n <count>     Number of top contributors (default: 10)

  health              Report code health metrics
    --max-file-size <n> Lines threshold for large file warning (default: 500)
    --max-complexity <n> Cyclomatic complexity threshold (default: 10)
    --check-coverage    Include test coverage gap analysis
```

### Global Options Inheritance

Commander.js `optsWithGlobals()` merges subcommand options with parent options. Without `enablePositionalOptions()` (default), global flags work in any position:

```bash
devkit --json todo --author alice    # works
devkit todo --json --author alice    # also works
```

---

## Configuration Format

### `.devkitrc.json`

JSON format — zero parser dependencies, TypeScript-friendly, familiar to Node.js developers.

### Override Order

```
hardcoded defaults → .devkitrc.json → CLI flags
```

CLI flags always win. Missing config file is not an error (use defaults).

### Schema

```json
{
  "output": {
    "format": "color",          // "color" | "plain" | "json"
    "verbose": false
  },
  "ignore": [                   // Global ignore patterns for all modules
    "node_modules", "dist", ".git", "coverage"
  ],
  "todo": {
    "tags": ["TODO", "FIXME", "HACK", "XXX"],
    "ignorePaths": []
  },
  "depAudit": {
    "registryUrl": "https://registry.npmjs.org",
    "ignoreDeps": []
  },
  "gitStats": {
    "defaultBranch": "main",
    "since": null
  },
  "codeHealth": {
    "maxFileSize": 500,
    "complexityThreshold": 10
  }
}
```

### Config Loader (`src/shared/config.ts`)

```typescript
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface DevKitConfig {
  output?: { format?: OutputMode; verbose?: boolean };
  ignore?: string[];
  todo?: { tags?: string[]; ignorePaths?: string[] };
  depAudit?: { registryUrl?: string; ignoreDeps?: string[] };
  gitStats?: { defaultBranch?: string; since?: string };
  codeHealth?: { maxFileSize?: number; complexityThreshold?: number };
}

const DEFAULTS: DevKitConfig = {
  output: { format: 'color', verbose: false },
  ignore: ['node_modules', 'dist', '.git', 'coverage'],
  todo: { tags: ['TODO', 'FIXME', 'HACK', 'XXX'] },
  depAudit: { registryUrl: 'https://registry.npmjs.org' },
  gitStats: { defaultBranch: 'main' },
  codeHealth: { maxFileSize: 500, complexityThreshold: 10 },
};

export async function loadConfig(configPath: string): Promise<DevKitConfig> {
  try {
    const raw = await readFile(configPath, 'utf-8');
    return deepMerge(DEFAULTS, JSON.parse(raw));
  } catch {
    return { ...DEFAULTS }; // Missing config is fine
  }
}
```

---

## Output Formatting Spec

### Three Output Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| `color` | Default (TTY) | Chalk-colored tables with severity highlighting |
| `plain` | `--no-color`, `NO_COLOR` env, non-TTY | Same layout, no ANSI codes |
| `json` | `--json` flag | Full dataset as `JSON.stringify(result, null, 2)` to stdout |

### Mode Resolution

```typescript
type OutputMode = 'color' | 'plain' | 'json';

function resolveOutputMode(opts: { json?: boolean; color?: boolean }): OutputMode {
  if (opts.json) return 'json';
  if (opts.color === false || process.env.NO_COLOR !== undefined) return 'plain';
  return 'color';
}

function createChalk(mode: OutputMode): Chalk {
  return mode === 'plain' ? new Chalk({ level: 0 }) : new Chalk();
}
```

### Human-Readable Output

Default shows summary; `--verbose` shows all items:

```
$ devkit todo
Found 12 TODOs across 5 files (3 FIXME, 1 HACK)
Run with --verbose to see all items, or --json for structured output.

$ devkit todo --verbose
FILE                    LINE  TYPE   AGE     COMMENT
src/auth/login.ts       42    TODO   3d ago  Add rate limiting
src/auth/login.ts       87    FIXME  2w ago  Session token expiry not handled
src/db/queries.ts       15    HACK   5mo     Workaround for join performance
...
```

### Table Rendering

Chalk + manual string padding — no extra table library. ~20 lines of utility code in `formatter.ts`:

```typescript
function formatTable(headers: string[], rows: string[][], chalk: Chalk): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  const headerLine = headers.map((h, i) => chalk.bold(h.padEnd(colWidths[i]))).join('  ');
  const separator = colWidths.map(w => '-'.repeat(w)).join('  ');
  const dataLines = rows.map(row =>
    row.map((cell, i) => cell.padEnd(colWidths[i])).join('  ')
  );
  return [headerLine, separator, ...dataLines].join('\n');
}
```

### JSON Output

Full dataset, always. Summary/verbose only affects human-readable display:

```typescript
if (outputMode === 'json') {
  console.log(JSON.stringify(result, null, 2));
  return;
}
```

### Progress Indicators

For long-running operations (dep-audit network calls), use a simple stderr spinner:

```typescript
const frames = ['|', '/', '-', '\\'];
let i = 0;
const spinner = setInterval(() => {
  process.stderr.write(`\r${frames[i++ % frames.length]} Checking npm registry...`);
}, 100);
// When done:
clearInterval(spinner);
process.stderr.write('\r\x1B[K');
```

Progress writes to **stderr** so stdout stays clean for piping/JSON.

### Error Formatting

Errors include actionable suggestions:

```
Error: Target path does not exist: /foo/bar
  Suggestion: Check the path and try again. Use --target to specify a different directory.
```

---

## Testing Strategy

### Framework: Vitest

### Test Types

| Type | Location | What It Tests | Mocking |
|------|----------|---------------|---------|
| Unit | `tests/unit/` | Individual module logic | `memfs` for fs, `vi.mock` for git/npm |
| Integration | `tests/integration/` | Full CLI commands | Spawn actual process, check stdout |
| Fixtures | `tests/fixtures/` | Sample projects with known data | N/A |

### Mocking Patterns

- **Filesystem:** `memfs` with `vi.mock('node:fs')` — modules use `node:fs` imports
- **Git commands:** `vi.mock('node:child_process')` — mock `execSync`/`exec` output
- **npm registry:** `vi.stubGlobal('fetch')` — mock fetch responses
- **Modules accept `targetPath`** — never call `process.cwd()` directly (testability)

### Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
});
```

---

## Data Flow

```
User runs: devkit todo --author alice --json

1. Commander.js parses args
   ├── Global options: { json: true, verbose: false, target: cwd, config: '.devkitrc.json' }
   └── Command options: { author: 'alice' }

2. Action handler:
   ├── loadConfig('.devkitrc.json')  →  DevKitConfig
   ├── resolveOutputMode({ json: true })  →  'json'
   ├── Merge: { ...defaults, ...config.todo, ...cliFlags }
   ├── todoTracker.validate(mergedOptions)  →  null (OK)
   └── todoTracker.execute(mergedOptions)  →  ModuleResult

3. Formatter:
   └── outputMode === 'json'
       → console.log(JSON.stringify(result, null, 2))
       → exit 0
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Module rendering | Modules return data, formatter renders | Testability, consistency, separation of concerns |
| Table library | Chalk + manual padding | No extra dependency for simple columnar data |
| Config format | JSON (.devkitrc.json) | Zero parser deps, TS-friendly |
| Config missing | Silently use defaults | Config is optional convenience |
| Error handling | Never throw from modules | Predictable control flow, typed errors |
| Partial results | Success + warnings array | Don't fail the whole run for one unreadable file |
| Progress output | Stderr spinner | Keep stdout clean for piping |
| Global options | Commander.js optsWithGlobals() | Built-in inheritance, no custom plumbing |
| Option position | No enablePositionalOptions() | Global flags work before or after subcommand |
| Module registration | Explicit imports | Type-safe, simple, no dynamic discovery overhead |
| Testing | Vitest + memfs + vi.mock | Official patterns, fast, good DX |

---

## Package Configuration

```json
{
  "name": "devkit",
  "version": "0.1.0",
  "type": "module",
  "bin": { "devkit": "./dist/index.js" },
  "files": ["dist"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "glob": "^10.0.0",
    "simple-git": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.4.0",
    "@types/node": "^20.0.0",
    "memfs": "^4.6.0",
    "tsx": "^4.7.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "outDir": "dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```
