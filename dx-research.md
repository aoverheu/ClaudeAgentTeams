# DevKit DX Research — Developer Experience Patterns

## 1. Output Formatting

### Recommendation: Chalk + Manual Padding (no extra table library)

For a CLI with 4 modules producing varied output, a lightweight approach works best. Avoid `cli-table3` (heavyweight, limited customization). Instead, use Chalk directly with simple string padding for aligned columns.

**Why not cli-table3?** It adds a dependency for something achievable in ~20 lines of utility code. DevKit's tables are simple key-value or columnar data, not complex grids.

### Output Mode Architecture

Three output modes, controlled by flags and environment:

```typescript
type OutputMode = 'color' | 'plain' | 'json';

function resolveOutputMode(flags: { json?: boolean; noColor?: boolean }): OutputMode {
  if (flags.json) return 'json';
  if (flags.noColor || process.env.NO_COLOR !== undefined) return 'plain';
  return 'color';
}
```

### Color Handling with Chalk

Chalk v5 automatically respects `NO_COLOR` and `FORCE_COLOR` env vars. For the `--no-color` CLI flag, create a Chalk instance with level 0:

```typescript
import { Chalk } from 'chalk';
import chalk from 'chalk';

// Factory based on CLI flags
function createChalk(noColor: boolean): typeof chalk {
  if (noColor) return new Chalk({ level: 0 });
  return chalk;
}
```

**Key behaviors:**
- `NO_COLOR` env var (any value) disables colors automatically
- `--no-color` flag → create `new Chalk({ level: 0 })`
- Piped output (non-TTY) → Chalk auto-disables colors
- `FORCE_COLOR=1|2|3` → force colors even in pipes

### Table Output Utility

```typescript
// src/shared/format.ts
function formatTable(
  headers: string[],
  rows: string[][],
  chalk: typeof import('chalk').default
): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );

  const headerLine = headers
    .map((h, i) => chalk.bold(h.padEnd(colWidths[i])))
    .join('  ');

  const separator = colWidths.map(w => '-'.repeat(w)).join('  ');

  const dataLines = rows.map(row =>
    row.map((cell, i) => cell.padEnd(colWidths[i])).join('  ')
  );

  return [headerLine, separator, ...dataLines].join('\n');
}
```

### JSON Mode

Every command supports `--json` flag. JSON output goes to stdout with no extra formatting:

```typescript
// In each module's run() method:
if (outputMode === 'json') {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return;
}
```

**JSON contract:** Each module defines a typed output interface. JSON output is always the full data; summary/verbose only affects human-readable output.

### Summary vs Detail (--verbose)

Default output shows a summary. `--verbose` shows full detail.

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

### Progress Indicators

For `dep-audit` (which calls npm registry), use a simple spinner on stderr so it doesn't pollute stdout:

```typescript
// Simple spinner — no dependency needed
const frames = ['|', '/', '-', '\\'];
let i = 0;
const spinner = setInterval(() => {
  process.stderr.write(`\r${frames[i++ % frames.length]} Checking npm registry...`);
}, 100);

// When done:
clearInterval(spinner);
process.stderr.write('\r\x1B[K'); // clear line
```

Write progress to **stderr** so stdout remains clean for piping/JSON.

---

## 2. Configuration File

### Format: `.devkitrc.json`

JSON chosen over YAML/TOML because: zero parser dependency, TypeScript type-checking friendly, familiar to Node.js developers.

### Schema

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "output": {
      "type": "object",
      "properties": {
        "format": { "enum": ["color", "plain", "json"], "default": "color" },
        "verbose": { "type": "boolean", "default": false }
      }
    },
    "ignore": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Glob patterns for files/dirs to exclude from all scans",
      "default": ["node_modules", "dist", ".git", "coverage"]
    },
    "todo": {
      "type": "object",
      "properties": {
        "tags": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["TODO", "FIXME", "HACK", "XXX"]
        },
        "ignorePaths": { "type": "array", "items": { "type": "string" } }
      }
    },
    "depAudit": {
      "type": "object",
      "properties": {
        "registryUrl": { "type": "string", "default": "https://registry.npmjs.org" },
        "ignoreDeps": { "type": "array", "items": { "type": "string" } }
      }
    },
    "gitStats": {
      "type": "object",
      "properties": {
        "defaultBranch": { "type": "string", "default": "main" },
        "since": { "type": "string", "description": "Date filter, e.g. '6 months ago'" }
      }
    },
    "codeHealth": {
      "type": "object",
      "properties": {
        "maxFileSize": { "type": "number", "default": 500, "description": "Lines threshold for 'large file' warning" },
        "complexityThreshold": { "type": "number", "default": 10 }
      }
    }
  }
}
```

### Example `.devkitrc.json`

```json
{
  "output": { "format": "color" },
  "ignore": ["node_modules", "dist", "*.generated.ts"],
  "todo": {
    "tags": ["TODO", "FIXME", "HACK", "PERF"]
  },
  "depAudit": {
    "ignoreDeps": ["@types/node"]
  },
  "codeHealth": {
    "maxFileSize": 300
  }
}
```

### Override Order

```
defaults (hardcoded) → .devkitrc.json → CLI flags
```

CLI flags always win. Implementation:

```typescript
// src/shared/config.ts
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface DevKitConfig { /* typed schema */ }

const DEFAULTS: DevKitConfig = {
  output: { format: 'color', verbose: false },
  ignore: ['node_modules', 'dist', '.git', 'coverage'],
  // ... module defaults
};

function loadConfig(cwd: string): DevKitConfig {
  const configPath = join(cwd, '.devkitrc.json');
  if (!existsSync(configPath)) return { ...DEFAULTS };

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return deepMerge(DEFAULTS, raw);
  } catch (err) {
    console.error(`Invalid .devkitrc.json: ${(err as Error).message}`);
    console.error('Run "devkit config --validate" to check your config file.');
    process.exit(1);
  }
}
```

### Config Validation

Validate at load time with a simple schema checker (no ajv dependency needed for this scope). Report errors with file path, the invalid key, and what was expected:

```
Error in .devkitrc.json:
  "output.format" must be one of: color, plain, json
  Got: "colored"
```

---

## 3. Testing Strategy with Vitest

### Test Structure

```
tests/
  unit/
    todo.test.ts          # TODO scanner logic
    dep-audit.test.ts     # Dependency analysis logic
    git-stats.test.ts     # Git stats parsing
    code-health.test.ts   # Code metrics logic
    config.test.ts        # Config loading/merging
    format.test.ts        # Output formatting utilities
  integration/
    cli.test.ts           # Full CLI command tests (spawn process)
  fixtures/
    sample-project/       # Fake project dir with known TODOs, package.json, etc.
    package-outdated.json # package.json with known outdated deps
    package-clean.json    # package.json with all current deps
```

### Unit Test Patterns

**Filesystem mocking with memfs** (recommended by Vitest docs):

```typescript
// tests/unit/todo.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs';

vi.mock('node:fs');
vi.mock('node:fs/promises');

beforeEach(() => {
  vol.reset();
});

describe('todo scanner', () => {
  it('finds TODO comments in source files', () => {
    vol.fromJSON({
      '/project/src/app.ts': '// TODO: implement auth\nconst x = 1;\n// FIXME: broken',
      '/project/src/util.ts': '// no todos here',
    }, '/project');

    const results = scanTodos('/project/src');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      file: 'src/app.ts',
      line: 1,
      type: 'TODO',
      comment: 'implement auth',
    });
  });
});
```

**Git command mocking** (for git-stats):

```typescript
// tests/unit/git-stats.test.ts
import { describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('git-stats', () => {
  it('parses commit frequency from git log', () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from(
      'abc1234|Alice|2024-01-15|feat: add login\n' +
      'def5678|Bob|2024-01-14|fix: typo\n'
    ));

    const stats = getCommitStats('/project');
    expect(stats.totalCommits).toBe(2);
    expect(stats.contributors).toContain('Alice');
  });
});
```

**npm registry mocking** (for dep-audit):

```typescript
// tests/unit/dep-audit.test.ts
import { describe, expect, it, vi } from 'vitest';

// Mock fetch for registry calls
vi.stubGlobal('fetch', vi.fn());

describe('dep-audit', () => {
  it('flags outdated dependencies', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({
        'dist-tags': { latest: '2.0.0' },
      }))
    );

    const result = await auditDep('some-package', '^1.0.0');
    expect(result.outdated).toBe(true);
    expect(result.latest).toBe('2.0.0');
  });
});
```

### Integration Test Pattern

Spawn the actual CLI process and check stdout:

```typescript
// tests/integration/cli.test.ts
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('devkit CLI', () => {
  it('outputs JSON when --json flag is passed', () => {
    const output = execSync('npx tsx src/cli.ts todo --json', {
      cwd: '/path/to/test-fixture',
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('todos');
    expect(Array.isArray(parsed.todos)).toBe(true);
  });

  it('respects --no-color flag', () => {
    const output = execSync('npx tsx src/cli.ts todo --no-color', {
      cwd: '/path/to/test-fixture',
      encoding: 'utf-8',
    });
    // ANSI escape codes start with \x1B[
    expect(output).not.toMatch(/\x1B\[/);
  });
});
```

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
      exclude: ['src/cli.ts'], // entry point, tested via integration
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Coverage Targets

| Area | Target | Rationale |
|------|--------|-----------|
| Statements | 80% | High enough to catch gaps, not so high it forces trivial tests |
| Branches | 75% | Branch coverage catches missed error paths |
| Functions | 80% | Every public function should be tested |
| Lines | 80% | Consistent with statements |

---

## 4. Installation and Usage

### package.json bin field

```json
{
  "name": "devkit",
  "version": "0.1.0",
  "bin": {
    "devkit": "./dist/cli.js"
  },
  "files": ["dist"],
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "dev": "tsx src/cli.ts"
  }
}
```

**Important:** The `bin` entry points to `dist/cli.js` (compiled), and `dist/cli.js` must start with `#!/usr/bin/env node` shebang.

### Usage Modes

```bash
# Development (no build needed)
npx tsx src/cli.ts todo --verbose

# npx (one-off use, no install)
npx devkit todo

# Global install
npm install -g devkit
devkit todo --json

# Local dev dependency
npm install --save-dev devkit
npx devkit dep-audit
```

### CLI Entry Point Shebang

```typescript
// src/cli.ts — first line must be:
#!/usr/bin/env node

import { program } from 'commander';
// ... rest of CLI setup
```

TypeScript compilation preserves the shebang comment. Ensure `tsconfig.json` has:

```json
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

---

## Summary of Recommendations

| Area | Decision | Key Rationale |
|------|----------|---------------|
| Tables | Chalk + manual padding | No extra dependency, full control |
| JSON mode | `--json` flag, full data to stdout | Composable with jq, scripts |
| Colors | Chalk v5, respect NO_COLOR + --no-color | Standard env var support built-in |
| Progress | Simple stderr spinner | No dependency, doesn't pollute stdout |
| Config | `.devkitrc.json` | Zero-dep parsing, TS-friendly |
| Override order | defaults -> config -> CLI flags | Standard, unsurprising |
| Unit tests | Vitest + memfs + vi.mock | Official recommended patterns |
| Integration tests | Spawn process, check stdout | True end-to-end validation |
| Coverage | 80% statements/lines/functions, 75% branches | Practical targets |
| Install | bin field + shebang + files array | Standard npm package pattern |
