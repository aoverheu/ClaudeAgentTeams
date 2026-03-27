import { access, readFile } from 'node:fs/promises';
import { relative, resolve, basename, extname, dirname } from 'node:path';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { glob } from 'glob';
import type {
  Module,
  CodeHealthOptions,
  ModuleOutput,
  ModuleError,
  ModuleResult,
  ResultItem,
  Severity,
  ResultWarning,
  ReportSection,
  ReportSectionItem,
} from '../../shared/types.js';
import { ModuleErrorCode } from '../../shared/types.js';

/** Directories always excluded from scanning */
const DEFAULT_IGNORE = ['node_modules', 'dist', '.git', 'coverage'];

/** Branching keywords for simple cyclomatic complexity proxy */
const COMPLEXITY_PATTERNS = [
  /\bif\s*\(/g,
  /\belse\s+if\s*\(/g,
  /\bswitch\s*\(/g,
  /\bcase\s+/g,
  /\bfor\s*\(/g,
  /\bwhile\s*\(/g,
  /\bcatch\s*\(/g,
  /&&/g,
  /\|\|/g,
  /\?[^?:]/g, // ternary (avoid matching ??)
];

interface FileMetrics {
  filePath: string;
  relPath: string;
  extension: string;
  lineCount: number;
  complexity: number;
}

async function analyzeFile(filePath: string, basePath: string): Promise<FileMetrics | null> {
  const relPath = relative(basePath, filePath).replace(/\\/g, '/');
  const extension = extname(filePath).toLowerCase() || '(no ext)';

  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;

    // Calculate simple complexity — count branching statements
    let complexity = 1; // base complexity
    for (const line of lines) {
      for (const pattern of COMPLEXITY_PATTERNS) {
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;
        const matches = line.match(pattern);
        if (matches) {
          complexity += matches.length;
        }
      }
    }

    return { filePath, relPath, extension, lineCount, complexity };
  } catch {
    // Skip binary/unreadable files
    return null;
  }
}

function buildGlobIgnore(exclude?: string[]): string[] {
  const patterns = DEFAULT_IGNORE.map((d) => `**/${d}/**`);
  if (exclude) {
    patterns.push(...exclude);
  }
  return patterns;
}

/**
 * Check if a source file has a corresponding test file.
 * For src/modules/foo/index.ts, looks for tests containing "foo" in their path.
 * For src/foo.ts, looks for tests/foo.test.ts or tests/unit/foo.test.ts.
 */
function findTestFile(relSourcePath: string, allFiles: string[]): boolean {
  // Only check source files under src/
  if (!relSourcePath.startsWith('src/')) return true;

  const base = basename(relSourcePath, extname(relSourcePath));
  const dirName = basename(dirname(relSourcePath));

  // Look for a test file that matches by name or parent directory
  return allFiles.some((f) => {
    if (!f.includes('test')) return false;
    const testBase = basename(f, extname(f)).replace(/\.test$/, '').replace(/\.spec$/, '');
    // Direct name match (e.g., formatter.ts -> formatter.test.ts)
    if (testBase === base && base !== 'index') return true;
    // Directory-based match (e.g., src/modules/code-health/index.ts -> code-health.test.ts)
    if (base === 'index' && f.includes(dirName)) return true;
    return false;
  });
}

const codeHealth: Module<CodeHealthOptions> = {
  name: 'code-health',
  description: 'Report code health metrics — file sizes, complexity, test coverage gaps',

  async validate(options): Promise<ModuleError | null> {
    try {
      await access(resolve(options.targetPath));
    } catch {
      return {
        code: ModuleErrorCode.TARGET_NOT_FOUND,
        message: `Target path not found: ${options.targetPath}`,
        suggestion: 'Check that the path exists and you have read permission.',
      };
    }
    return null;
  },

  async toReportSection(options): Promise<ReportSection> {
    const output = await this.execute(options);

    if (!output.success) {
      return {
        title: 'Code Health',
        summary: `Error: ${output.error.message}`,
        items: [],
        metadata: { error: true },
      };
    }

    const { summary, items } = output;
    const sectionItems: ReportSectionItem[] = items.map((item) => ({
      label: item.file ?? (item.meta?.type as string) ?? 'summary',
      value: item.message,
      severity: item.severity,
      meta: item.meta,
    }));

    const totalFiles = (summary.totalFiles as number) ?? 0;
    const totalLines = (summary.totalLines as number) ?? 0;
    const parts: string[] = [`${totalFiles} files, ${totalLines} lines`];
    if (summary.bySeverity.error > 0) parts.push(`${summary.bySeverity.error} errors`);
    if (summary.bySeverity.warning > 0) parts.push(`${summary.bySeverity.warning} warnings`);

    return {
      title: 'Code Health',
      summary: parts.join(', '),
      items: sectionItems,
      metadata: { durationMs: output.durationMs, totalFiles, totalLines },
    };
  },

  async execute(options): Promise<ModuleOutput> {
    const startTime = performance.now();
    const basePath = resolve(options.targetPath);
    const warnings: ResultWarning[] = [];

    const maxFileSize = options.maxFileSize ?? 500;
    const maxComplexity = options.maxComplexity ?? 10;

    // Build include patterns — default to common source file extensions
    const includePatterns = options.include?.length
      ? options.include
      : ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.json', '**/*.md', '**/*.css', '**/*.html'];

    // Discover files
    let files: string[];
    try {
      files = await glob(includePatterns, {
        cwd: basePath,
        absolute: true,
        nodir: true,
        ignore: buildGlobIgnore(options.exclude),
        dot: false,
      });
    } catch (err) {
      return {
        moduleName: this.name,
        success: false,
        error: {
          code: ModuleErrorCode.INTERNAL_ERROR,
          message: `Failed to scan files: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }

    // Analyze all files
    const metrics: FileMetrics[] = [];
    for (const file of files) {
      const result = await analyzeFile(file, basePath);
      if (result) {
        metrics.push(result);
      }
    }

    // Collect relative paths for test-file matching
    const allRelPaths = metrics.map((m) => m.relPath);

    // Aggregate stats
    const filesByExt: Record<string, number> = {};
    const linesByExt: Record<string, number> = {};
    for (const m of metrics) {
      filesByExt[m.extension] = (filesByExt[m.extension] ?? 0) + 1;
      linesByExt[m.extension] = (linesByExt[m.extension] ?? 0) + m.lineCount;
    }

    // Build result items
    const items: ResultItem[] = [];

    // File count summary items (info)
    for (const [ext, count] of Object.entries(filesByExt).sort((a, b) => b[1] - a[1])) {
      items.push({
        severity: 'info',
        message: `${ext}: ${count} files, ${linesByExt[ext]} lines`,
        meta: { type: 'file-count', extension: ext, fileCount: count, lineCount: linesByExt[ext] },
      });
    }

    // Large file warnings
    for (const m of metrics) {
      if (m.lineCount > maxFileSize) {
        items.push({
          file: m.relPath,
          severity: 'warning',
          message: `Large file: ${m.lineCount} lines (threshold: ${maxFileSize})`,
          meta: { type: 'large-file', lineCount: m.lineCount, threshold: maxFileSize },
        });
      }
    }

    // Complexity warnings
    for (const m of metrics) {
      if (m.complexity > maxComplexity) {
        const severity: Severity = m.complexity > maxComplexity * 2 ? 'error' : 'warning';
        items.push({
          file: m.relPath,
          severity,
          message: `High complexity: ${m.complexity} (threshold: ${maxComplexity})`,
          meta: { type: 'complexity', complexity: m.complexity, threshold: maxComplexity },
        });
      }
    }

    // Test coverage gap detection
    if (options.checkCoverage !== false) {
      const sourceFiles = metrics.filter(
        (m) => m.relPath.startsWith('src/') && (m.extension === '.ts' || m.extension === '.js' || m.extension === '.tsx' || m.extension === '.jsx')
      );
      for (const m of sourceFiles) {
        if (!findTestFile(m.relPath, allRelPaths)) {
          items.push({
            file: m.relPath,
            severity: 'info',
            message: 'No corresponding test file found',
            meta: { type: 'missing-test' },
          });
        }
      }
    }

    // Build summary
    const bySeverity: Record<Severity, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    for (const item of items) {
      bySeverity[item.severity]++;
    }

    const totalFiles = metrics.length;
    const totalLines = metrics.reduce((sum, m) => sum + m.lineCount, 0);
    const durationMs = Math.round(performance.now() - startTime);

    const result: ModuleResult = {
      moduleName: this.name,
      success: true,
      summary: {
        total: items.length,
        bySeverity,
        totalFiles,
        totalLines,
      },
      items,
      warnings,
      durationMs,
    };

    return result;
  },
};

export default codeHealth;
