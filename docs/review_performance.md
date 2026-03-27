# Performance Review Findings

## Summary

The DevKit codebase has two significant performance bottlenecks: sequential file I/O in the todo-tracker and code-health modules (which scales linearly with file count), and sequential git diff calls in git-stats (up to 50 subprocess spawns per invocation). There are also unbounded memory concerns when processing large repositories. Overall the code is functional for small-to-medium projects but would degrade noticeably on repositories with thousands of files or deep git histories.

## Findings

### [HIGH] Sequential file scanning in todo-tracker — no parallelism
**File:** src/modules/todo-tracker/index.ts:120-127
**Issue:** Files are scanned one at a time in a `for...of` loop with `await scanFile(file, basePath)`. Each file open/read/close happens sequentially, so the total wall-clock time is the sum of all individual file reads rather than being bounded by I/O concurrency.
**Impact:** With 10,000 files, this could take 30-60 seconds on spinning disk or networked filesystems where per-file latency dominates. On SSD with warm caches the effect is smaller but still measurable (5-10x slower than parallel). The streaming readline approach per file is good for memory, but the sequential outer loop negates I/O throughput.
**Recommendation:** Use a bounded `Promise.all` or a concurrency limiter (e.g., `p-limit` with concurrency of 20-50) to scan multiple files in parallel:
```ts
import pLimit from 'p-limit';
const limit = pLimit(30);
const allResults = await Promise.all(
  files.map(file => limit(() => scanFile(file, basePath).catch(() => [])))
);
const allComments = allResults.flat();
```

### [HIGH] Sequential file analysis in code-health module — same pattern
**File:** src/modules/code-health/index.ts:157-162
**Issue:** Identical sequential scanning pattern as todo-tracker. Each file is read with `await readFile(filePath, 'utf-8')` inside `analyzeFile()`, called one at a time in a `for...of` loop.
**Impact:** Same scaling issue as todo-tracker. Additionally, `analyzeFile` reads the *entire file into memory* (line 48: `readFile(filePath, 'utf-8')`) to split into lines and count complexity. For a 10,000-file repo this processes files sequentially and holds each file's full content in memory during analysis.
**Recommendation:** Parallelize with a concurrency limiter, same as todo-tracker recommendation.

### [HIGH] Sequential git diff calls in git-stats — N+1 subprocess problem
**File:** src/modules/git-stats/index.ts:96-105
**Issue:** For up to 50 recent commits, the code runs `await git.diffSummary([...])` sequentially in a loop. Each call spawns a `git diff-tree` subprocess, waits for it to complete, then moves to the next commit.
**Impact:** Each subprocess spawn has ~50-100ms overhead on Windows. With 50 commits, this adds 2.5-5 seconds of pure subprocess overhead, on top of the actual git computation time. On repositories with large diffs, this could be significantly worse.
**Recommendation:** Use `Promise.all` with a concurrency limit to run multiple diff calls in parallel:
```ts
const limit = pLimit(10);
const diffResults = await Promise.all(
  recentCommits.map(commit => limit(async () => {
    try {
      return await git.diffSummary([`${commit.hash}^`, commit.hash]);
    } catch { return null; }
  }))
);
```
Alternatively, use `git log --stat` or `git log --name-only` in a single call to get file change information for all commits at once, avoiding N subprocess spawns entirely.

### [MEDIUM] Entire file loaded into memory for complexity analysis
**File:** src/modules/code-health/index.ts:48-49
**Issue:** `analyzeFile` reads the entire file content into a single string with `readFile(filePath, 'utf-8')`, then splits on newlines. For very large files (generated code, bundled output, large data files), this allocates the full file size in memory as a string, plus the split array.
**Impact:** A single 50MB generated file would allocate ~100MB of memory (string + split array). If multiple large files are encountered (even sequentially), V8 garbage collection pressure increases. The todo-tracker module avoids this by using `createReadStream` + `readline`, which is the better pattern.
**Recommendation:** Use the streaming `readline` approach (already used in todo-tracker's `scanFile`) instead of `readFile` + `split('\n')`. This would cap per-file memory usage regardless of file size.

### [MEDIUM] Math.min/max with spread on large arrays — stack overflow risk
**File:** src/modules/git-stats/index.ts:84-86
**Issue:** `Math.min(...dates)` and `Math.max(...dates)` spread the entire `dates` array as function arguments. JavaScript engines have a maximum call stack size, and spreading a large array as arguments can hit this limit.
**Impact:** With repositories containing ~100,000+ commits (common in large projects), this will throw a `RangeError: Maximum call stack size exceeded`. Even below that threshold, spreading tens of thousands of arguments is slower than a simple loop.
**Recommendation:** Use a reduction instead:
```ts
let earliest = Infinity, latest = -Infinity;
for (const d of dates) {
  if (d < earliest) earliest = d;
  if (d > latest) latest = d;
}
```

### [MEDIUM] No file-type filtering before scanning in todo-tracker
**File:** src/modules/todo-tracker/index.ts:95-106
**Issue:** The default glob pattern is `**/*` which matches all files including binary files (images, compiled assets, `.woff` fonts, `.png`, `.zip`, etc.). Each binary file is opened and streamed through readline before the `catch` silently skips it. The glob does exclude `node_modules/dist/.git/coverage` but not binary file extensions.
**Impact:** In a typical web project with images, fonts, and other assets, a significant percentage of matched files will be binary. Each still incurs a file open, partial read (until readline encounters binary data or completes), and close. With hundreds of asset files this adds unnecessary I/O.
**Recommendation:** Default to source-code-only glob patterns (similar to code-health's approach: `**/*.{ts,js,tsx,jsx,py,rb,go,rs,java,c,cpp,h,css,html,md,json,yaml,yml}`), or add a file-extension allowlist filter after globbing.

### [LOW] Config file loaded on every command invocation without caching
**File:** src/shared/config.ts:96-109
**Issue:** `loadConfig()` is called fresh on every CLI invocation — it reads the config file from disk, parses JSON, validates, and deep-merges with defaults. There is no in-memory cache.
**Impact:** Minimal for a CLI tool (single invocation per run). This would only matter if DevKit were used as a library with repeated calls, or if the config file were on a slow network mount. As a CLI tool, this is acceptable.
**Recommendation:** No action needed for CLI usage. If DevKit is ever used as a library, consider caching the parsed config with a file-watcher invalidation.

### [LOW] Redundant simpleGit instantiation in git-stats validate + execute
**File:** src/modules/git-stats/index.ts:19,34
**Issue:** `simpleGit(options.targetPath)` is called in both `validate()` (line 19) and `execute()` (line 34). The command layer calls `validate()` then immediately calls `execute()`, so the git instance is created twice.
**Impact:** Negligible — `simpleGit()` is a lightweight factory that doesn't spawn a subprocess. Mentioned for completeness only.
**Recommendation:** Could pass the git instance from validate to execute, but the current Module interface doesn't support this. Not worth changing for the minimal overhead.

### [LOW] O(N*M) test file matching in code-health
**File:** src/modules/code-health/index.ts:85-102
**Issue:** `findTestFile()` iterates over `allFiles` (all discovered file paths) for each source file. With `allFiles.some(...)` this is O(N) per source file, and O(N*M) total where N is all files and M is source files.
**Impact:** For a repo with 1,000 source files and 5,000 total files, this is 5,000,000 string comparisons. Still fast in practice (< 100ms) but scales quadratically.
**Recommendation:** Build a `Set` of test file base names and directory names upfront for O(1) lookups instead of O(N) `some()` calls.

## Finding Count by Severity
- Critical: 0
- High: 3
- Medium: 3
- Low: 3
