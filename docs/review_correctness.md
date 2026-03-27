# Correctness Review Findings

## Summary

The DevKit codebase has solid error handling foundations with structured error types and validation. However, there are real correctness issues around binary file handling, the git-stats module's behavior with large repos and edge cases, and a version comparison bug in dep-audit that produces wrong results when the installed version is newer than the registry version. Windows path handling is mostly correct thanks to consistent use of `path.join` and `path.resolve`, though one normalization gap exists.

## Findings

### [HIGH] dep-audit classifyVersionGap returns wrong severity when local version is ahead of registry
**File:** src/modules/dep-audit/index.ts:47-52
**Issue:** `classifyVersionGap` only checks if `latest > current` for major/minor/patch. When a local version is *newer* than the registry (e.g., a pre-release, a private fork, or registry lag), all comparisons fall through to return `'info'` and the package is reported as outdated with a "patch update available" message at line 203. The version equality check at lines 192-198 only catches exact matches, not "local is ahead" cases.
**Scenario:** User has `"my-pkg": "^2.0.0"` installed but the registry latest is `1.5.0` (e.g., a scoped package pointing to a fork, or a recently published major that hasn't propagated). The tool will report `my-pkg 2.0.0 -> 1.5.0 (patch update available)` — a downgrade presented as an upgrade.
**Recommendation:** After the equality check, compare whether `current > latest` and skip those packages (or report them as `info` with a "local is ahead of registry" message).

### [HIGH] git-stats Math.min/max on spread of large arrays can stack overflow
**File:** src/modules/git-stats/index.ts:85-86
**Issue:** `Math.min(...dates)` and `Math.max(...dates)` spread the entire `dates` array as function arguments. JavaScript engines have a call stack limit (typically ~65K-125K arguments). For repositories with more than ~65K commits in the filtered range, this will throw a `RangeError: Maximum call stack size exceeded`.
**Scenario:** Running `devkit git-stats` on a large repo like the Linux kernel, Node.js, or any project with >65K commits.
**Recommendation:** Use a `for` loop or `reduce()` to find min/max instead of spreading into `Math.min`/`Math.max`.

### [MEDIUM] git-stats diffSummary fails on first commit with no parent
**File:** src/modules/git-stats/index.ts:98
**Issue:** The diff command `git.diffSummary([commit.hash + '^', commit.hash])` will fail for the initial commit because `commit.hash^` doesn't exist. The `catch` block silently swallows this, which is fine for correctness, but if the initial commit is in the "recent 50" window, its file changes are silently lost from the activity map.
**Scenario:** A new or small repo where the first commit is among the 50 most recent commits. File activity stats will undercount.
**Recommendation:** For the initial commit, use `git.diffSummary([commit.hash, '--root'])` or `git diff-tree --root` to capture its files.

### [MEDIUM] todo-tracker scans binary files as UTF-8 text
**File:** src/modules/todo-tracker/index.ts:42-44
**Issue:** `createReadStream(filePath, { encoding: 'utf-8' })` will attempt to decode any file (images, compiled binaries, `.woff` fonts, etc.) as UTF-8 text. While this won't crash (the catch block at line 124 handles errors), binary files with sequences that happen to contain "TODO", "FIXME", or "HACK" as byte patterns will produce false positives. Additionally, large binary files (e.g., bundled JS, images) waste I/O time being read line-by-line.
**Scenario:** A repo containing `.png`, `.pdf`, `.wasm`, or other binary files. False TODO matches from binary content.
**Recommendation:** Either check file extensions against a known-text allowlist, or read the first few bytes and skip files with null bytes (a common binary detection heuristic).

### [MEDIUM] code-health analyzeFile reads entire file into memory
**File:** src/modules/code-health/index.ts:48
**Issue:** `readFile(filePath, 'utf-8')` loads the entire file contents into a single string. For very large generated files (e.g., bundled JS, large JSON data files, minified CSS), this can spike memory usage significantly. Unlike todo-tracker which uses streaming readline, code-health buffers everything.
**Scenario:** A repo with large generated/bundled files (e.g., a 50MB `bundle.js` or large JSON fixture). Memory spikes when analyzing these files.
**Recommendation:** Use streaming line counting (like todo-tracker does) or add a file-size pre-check to skip files above a reasonable threshold (e.g., 5MB).

### [MEDIUM] dep-audit encodeURIComponent double-encodes scoped packages
**File:** src/modules/dep-audit/index.ts:64
**Issue:** `encodeURIComponent(packageName)` on a scoped package like `@types/node` produces `%40types%2Fnode`, which results in the URL `https://registry.npmjs.org/%40types%2Fnode/latest`. The npm registry expects scoped packages as `@types%2Fnode` (only the slash encoded, not the `@`). This causes a 404 for all scoped packages.
**Scenario:** Any project using scoped npm packages (`@angular/core`, `@types/node`, `@babel/core`, etc.) — these are extremely common.
**Recommendation:** For scoped packages, format as `@scope%2Fname` instead of encoding the entire string. For example: `packageName.startsWith('@') ? '@' + encodeURIComponent(packageName.slice(1)) : encodeURIComponent(packageName)`, or use the npm registry's convention of encoding only the `/`.

### [MEDIUM] Command handlers don't catch execute() exceptions
**File:** src/commands/todo.ts:33, src/commands/deps.ts:33, src/commands/git-stats.ts:33, src/commands/health.ts:33
**Issue:** The command action handlers call `module.execute(mergedOptions)` without a try/catch. While the module contract says "never throw," if an unexpected error occurs (e.g., out-of-memory, segfault in native module), the promise rejection will propagate as an unhandled rejection, crashing the process with a raw stack trace instead of a user-friendly error message.
**Scenario:** An unexpected runtime error inside any module's execute method (e.g., a bug in `simple-git`, a filesystem error during glob).
**Recommendation:** Wrap each `execute()` call in a try/catch that formats the error using `formatError` before exiting.

### [LOW] Config option merging can silently override CLI flags with config file values
**File:** src/commands/todo.ts:19-25 (and all other command files)
**Issue:** The merge order is `{ ...globalOpts, ...config.todo, ...options }`. The `config.todo` spread sits between global opts and command-specific opts. If a config file sets a field that has the same name as a global option (like `verbose`), the config value overrides the CLI `--verbose` flag because Commander puts `verbose` in `globalOpts`, not in `options`. Only module-specific CLI flags (in `options`) take final precedence.
**Scenario:** User has `.devkitrc.json` with `"todo": { "verbose": false }` but runs `devkit --verbose todo`. The config value `false` overrides the CLI `--verbose` flag.
**Recommendation:** Change merge order to `{ ...config.todo, ...globalOpts, ...options }` so CLI flags always win over config file values.

### [LOW] code-health complexity patterns double-count `else if`
**File:** src/modules/code-health/index.ts:23-24
**Issue:** The patterns array includes both `/\bif\s*\(/g` and `/\belse\s+if\s*\(/g`. A line containing `else if (` will match *both* patterns, incrementing complexity by 2 instead of 1. Standard cyclomatic complexity counts `else if` as a single decision point.
**Scenario:** Any file with `else if` chains will have inflated complexity scores.
**Recommendation:** Either remove the separate `else if` pattern (since `if` already matches it), or make the `if` pattern exclude `else if` using a negative lookbehind: `/(?<!else\s)\bif\s*\(/g`.

### [LOW] parseInt without radix in Commander option parsers
**File:** src/commands/todo.ts:12, src/commands/health.ts:10-11, src/commands/git-stats.ts:13
**Issue:** `parseInt` is passed as the option parser callback (e.g., `.option('--older-than <days>', '...', parseInt)`). Commander calls it as `parseInt(value, previousValue)` where `previousValue` may be `undefined` on first parse. While `parseInt(str, undefined)` defaults to radix 10 in modern engines, this is technically relying on implicit behavior. More importantly, invalid input like `--older-than abc` will silently produce `NaN` with no validation error.
**Scenario:** User passes non-numeric value to a numeric option: `devkit todo --older-than foo`. The option becomes `NaN`, which may cause unexpected filtering behavior downstream.
**Recommendation:** Use a custom parser that validates the result: `(v) => { const n = parseInt(v, 10); if (isNaN(n)) throw new Error('must be a number'); return n; }`.

### [LOW] todo-tracker COMMENT_PATTERN matches inside strings and non-comment code
**File:** src/modules/todo-tracker/index.ts:29
**Issue:** The regex `/\b(TODO|FIXME|HACK)\b[:\s]*(.*)/i` matches any occurrence of TODO/FIXME/HACK on any line, not just in comments. Code like `const status = TodoStatus.TODO;` or `const HACK_THRESHOLD = 5;` or a string `"TODO: implement later"` would all produce false positives.
**Scenario:** Variable names, enum values, or string literals containing TODO/FIXME/HACK.
**Recommendation:** This is an accepted tradeoff for simplicity (comment-aware parsing is significantly more complex), but worth noting. Could be partially mitigated by requiring the match to follow a comment marker (`//`, `#`, `/*`, `*`, `--`).

## Finding Count by Severity
- Critical: 0
- High: 2
- Medium: 4
- Low: 4
