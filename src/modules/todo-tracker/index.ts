import { access, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { glob } from 'glob';
import type {
  Module,
  TodoOptions,
  ModuleOutput,
  ModuleError,
  ModuleResult,
  ResultItem,
  Severity,
  ResultWarning,
} from '../../shared/types.js';
import { ModuleErrorCode } from '../../shared/types.js';

/** Tags we scan for and their severity mapping */
const TAG_SEVERITY: Record<string, Severity> = {
  TODO: 'info',
  FIXME: 'warning',
  HACK: 'warning',
};

/** Directories always excluded from scanning */
const DEFAULT_IGNORE = ['node_modules', 'dist', '.git', 'coverage'];

/** Regex to match TODO/FIXME/HACK comments — captures tag and trailing text */
const COMMENT_PATTERN = /\b(TODO|FIXME|HACK)\b[:\s]*(.*)/i;

interface ParsedComment {
  tag: string;
  text: string;
  file: string;
  line: number;
}

async function scanFile(filePath: string, basePath: string): Promise<ParsedComment[]> {
  const results: ParsedComment[] = [];
  const relPath = relative(basePath, filePath).replace(/\\/g, '/');

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    const match = line.match(COMMENT_PATTERN);
    if (match) {
      results.push({
        tag: match[1].toUpperCase(),
        text: match[2].trim(),
        file: relPath,
        line: lineNum,
      });
    }
  }

  return results;
}

function buildGlobIgnore(exclude?: string[]): string[] {
  const patterns = DEFAULT_IGNORE.map((d) => `**/${d}/**`);
  if (exclude) {
    patterns.push(...exclude);
  }
  return patterns;
}

const todoTracker: Module<TodoOptions> = {
  name: 'todo-tracker',
  description: 'Scan codebase for TODO/FIXME/HACK comments',

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

  async execute(options): Promise<ModuleOutput> {
    const startTime = performance.now();
    const basePath = resolve(options.targetPath);
    const warnings: ResultWarning[] = [];

    // Build include patterns — default to all files
    const includePatterns = options.include?.length ? options.include : ['**/*'];

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

    // Filter to text-like files by attempting to read them
    const allComments: ParsedComment[] = [];
    for (const file of files) {
      try {
        const comments = await scanFile(file, basePath);
        allComments.push(...comments);
      } catch {
        // Skip binary/unreadable files silently
      }
    }

    // Filter by tag
    const tagFilter = options.tag?.toUpperCase();
    const filtered =
      !tagFilter || tagFilter === 'ALL'
        ? allComments
        : allComments.filter((c) => c.tag === tagFilter);

    // Build result items
    const items: ResultItem[] = filtered.map((c) => ({
      file: c.file,
      line: c.line,
      severity: TAG_SEVERITY[c.tag] ?? 'info',
      message: `[${c.tag}] ${c.text || '(no description)'}`,
      meta: { tag: c.tag, text: c.text },
    }));

    // Build summary
    const bySeverity: Record<Severity, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    for (const item of items) {
      bySeverity[item.severity]++;
    }

    const durationMs = Math.round(performance.now() - startTime);

    const result: ModuleResult = {
      moduleName: this.name,
      success: true,
      summary: {
        total: items.length,
        bySeverity,
      },
      items,
      warnings,
      durationMs,
    };

    return result;
  },
};

export default todoTracker;
