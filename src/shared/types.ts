// ============================================================================
// DevKit Module Interface Contract
// ============================================================================
// All 4 modules (todo-tracker, dep-audit, git-stats, code-health) implement
// the Module interface. This ensures consistent CLI integration, formatting,
// and error handling across the toolkit.
// ============================================================================

// ---------------------------------------------------------------------------
// Module Options (Input)
// ---------------------------------------------------------------------------

/** Global options that every module receives from the CLI framework */
export interface GlobalOptions {
  /** Target directory to analyze (defaults to cwd) */
  targetPath: string;
  /** Output as JSON instead of formatted tables */
  json: boolean;
  /** Show verbose/debug output */
  verbose: boolean;
}

/** Per-module specific options — each module extends this with its own fields */
export interface ModuleOptions extends GlobalOptions {
  /** Module-specific options passed through from Commander.js */
  [key: string]: unknown;
}

/** todo-tracker specific options */
export interface TodoOptions extends ModuleOptions {
  /** Filter TODOs by author (git blame) */
  author?: string;
  /** Filter by tag: TODO, FIXME, HACK, or all */
  tag?: 'TODO' | 'FIXME' | 'HACK' | 'all';
  /** Filter TODOs older than N days */
  olderThan?: number;
  /** Glob patterns for files to include */
  include?: string[];
  /** Glob patterns for files to exclude */
  exclude?: string[];
}

/** dep-audit specific options */
export interface DepAuditOptions extends ModuleOptions {
  /** Check only production dependencies */
  prodOnly?: boolean;
  /** Check only dev dependencies */
  devOnly?: boolean;
  /** Severity threshold: low, moderate, high, critical */
  severity?: 'low' | 'moderate' | 'high' | 'critical';
  /** Skip vulnerability check (offline mode) */
  skipVuln?: boolean;
}

/** git-stats specific options */
export interface GitStatsOptions extends ModuleOptions {
  /** Start date for the analysis window */
  since?: string;
  /** End date for the analysis window */
  until?: string;
  /** Filter by author name or email */
  author?: string;
  /** Number of top contributors to show */
  topN?: number;
}

/** code-health specific options */
export interface CodeHealthOptions extends ModuleOptions {
  /** Max file size threshold in lines (flag files above this) */
  maxFileSize?: number;
  /** Max cyclomatic complexity threshold */
  maxComplexity?: number;
  /** Include test coverage gap analysis */
  checkCoverage?: boolean;
  /** Glob patterns for files to include */
  include?: string[];
  /** Glob patterns for files to exclude */
  exclude?: string[];
}

// ---------------------------------------------------------------------------
// Module Results (Output)
// ---------------------------------------------------------------------------

/** Severity level for issues found by modules */
export type Severity = 'info' | 'warning' | 'error' | 'critical';

/** A single item in a module's results (one TODO, one dependency, etc.) */
export interface ResultItem {
  /** File path relative to target directory */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
  /** Severity of this item */
  severity: Severity;
  /** Short message describing the item */
  message: string;
  /** Additional structured data specific to the module */
  meta?: Record<string, unknown>;
}

/** Summary statistics for the module run */
export interface ResultSummary {
  /** Total items found */
  total: number;
  /** Breakdown by severity */
  bySeverity: Record<Severity, number>;
  /** Module-specific summary fields (e.g., "outdated: 5, vulnerable: 2") */
  [key: string]: unknown;
}

/** Warning about partial results — when something went wrong but we still have data */
export interface ResultWarning {
  /** What went wrong */
  message: string;
  /** What was skipped or degraded */
  context?: string;
}

/** Successful module result */
export interface ModuleResult {
  /** Module that produced this result */
  moduleName: string;
  /** Whether the run completed successfully (true even with warnings) */
  success: true;
  /** Summary statistics */
  summary: ResultSummary;
  /** Individual result items */
  items: ResultItem[];
  /** Non-fatal warnings (e.g., a file couldn't be read but others were fine) */
  warnings: ResultWarning[];
  /** Execution time in milliseconds */
  durationMs: number;
}

/** Failed module result — returned when the module cannot produce meaningful data */
export interface ModuleErrorResult {
  /** Module that produced this result */
  moduleName: string;
  /** Run did not complete */
  success: false;
  /** Error classification */
  error: ModuleError;
}

/** Union of success and error results */
export type ModuleOutput = ModuleResult | ModuleErrorResult;

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

/** Error codes for classifying module failures */
export enum ModuleErrorCode {
  /** Target path doesn't exist or isn't accessible */
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  /** Not a git repo (for git-dependent modules) */
  NOT_A_GIT_REPO = 'NOT_A_GIT_REPO',
  /** No package.json found (for dep-audit) */
  NO_PACKAGE_JSON = 'NO_PACKAGE_JSON',
  /** Required tool not installed (e.g., git) */
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  /** Permission denied reading files */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** Module hit an unexpected internal error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/** Structured error returned by modules */
export interface ModuleError {
  /** Machine-readable error code */
  code: ModuleErrorCode;
  /** Human-readable error message */
  message: string;
  /** Suggestion for how the user can fix this */
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Module Interface
// ---------------------------------------------------------------------------

/**
 * The contract every DevKit module must implement.
 *
 * Usage:
 * ```ts
 * import { Module, TodoOptions, ModuleOutput } from './shared/types';
 *
 * const todoTracker: Module<TodoOptions> = {
 *   name: 'todo-tracker',
 *   description: 'Scan codebase for TODO/FIXME/HACK comments',
 *   async execute(options) { ... },
 *   async validate(options) { ... },
 * };
 * ```
 */
export interface Module<TOptions extends ModuleOptions = ModuleOptions> {
  /** Unique module identifier — used as the CLI subcommand name */
  name: string;
  /** One-line description shown in --help output */
  description: string;

  /**
   * Main entry point. Analyzes the target and returns structured results.
   *
   * - Return ModuleResult on success (even with warnings/partial results)
   * - Return ModuleErrorResult only when no meaningful data can be produced
   * - Never throw — all errors should be caught and returned as ModuleErrorResult
   */
  execute(options: TOptions): Promise<ModuleOutput>;

  /**
   * Pre-flight validation. Checks that the target path exists, required tools
   * are installed, etc. Called before execute() so we can fail fast with a
   * helpful message.
   *
   * Returns null if valid, or a ModuleError describing what's wrong.
   */
  validate(options: TOptions): Promise<ModuleError | null>;
}

// ---------------------------------------------------------------------------
// Module Registration
// ---------------------------------------------------------------------------

/**
 * Each module is the default export of its entry file:
 *   src/modules/todo-tracker/index.ts  → export default todoTracker;
 *   src/modules/dep-audit/index.ts     → export default depAudit;
 *   src/modules/git-stats/index.ts     → export default gitStats;
 *   src/modules/code-health/index.ts   → export default codeHealth;
 *
 * The CLI entry point (src/cli.ts) imports and registers all modules:
 *   import todoTracker from './modules/todo-tracker';
 *   import depAudit from './modules/dep-audit';
 *   ...
 *   const modules: Module[] = [todoTracker, depAudit, gitStats, codeHealth];
 *
 * This explicit import approach is simple and gives us full type safety.
 * No dynamic discovery or plugin system needed at this scale.
 */
export type ModuleRegistry = Module[];
