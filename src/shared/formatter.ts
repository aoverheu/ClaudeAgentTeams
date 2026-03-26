import { Chalk, type ChalkInstance } from 'chalk';
import type { ModuleOutput, ModuleResult, Severity } from './types.js';
import type { OutputMode } from './config.js';

export function resolveOutputMode(opts: { json?: boolean; color?: boolean }): OutputMode {
  if (opts.json) return 'json';
  if (opts.color === false || process.env.NO_COLOR !== undefined) return 'plain';
  return 'color';
}

export function createChalk(mode: OutputMode): ChalkInstance {
  return mode === 'plain' ? new Chalk({ level: 0 }) : new Chalk();
}

export function formatTable(
  headers: string[],
  rows: string[][],
  c: ChalkInstance,
  rowColorizer?: (row: string[], rowIndex: number) => string[],
): string {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );
  const headerLine = headers.map((h, i) => c.bold(h.padEnd(colWidths[i]))).join('  ');
  const separator = colWidths.map(w => '-'.repeat(w)).join('  ');
  const dataLines = rows.map((row, rowIndex) => {
    const paddedRow = row.map((cell, i) => cell.padEnd(colWidths[i]));
    const coloredRow = rowColorizer ? rowColorizer(paddedRow, rowIndex) : paddedRow;
    return coloredRow.join('  ');
  });
  return [headerLine, separator, ...dataLines].join('\n');
}

export interface FormatOptions {
  outputMode: OutputMode;
  verbose: boolean;
  chalk: ChalkInstance;
  summary?: boolean;
}

const severityColor: Record<Severity, (c: ChalkInstance) => (text: string) => string> = {
  critical: (c) => (text) => c.red(text),
  error:    (c) => (text) => c.hex('#FA8072')(text),  // salmon
  warning:  (c) => (text) => c.yellow(text),
  info:     (c) => (text) => c.dim(text),
};

export function formatSummaryLine(result: ModuleResult, c: ChalkInstance): string {
  const hasProblems = result.summary.bySeverity.critical > 0 || result.summary.bySeverity.error > 0;
  const status = hasProblems ? c.red('needs attention') : c.green('ok');
  return `${result.moduleName}: ${result.summary.total} items — ${status}`;
}

export function formatOutput(result: ModuleOutput, opts: FormatOptions): void {
  if (opts.outputMode === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result.success) {
    formatError(result.error, opts.chalk);
    return;
  }

  const r = result;
  const c = opts.chalk;

  if (opts.summary) {
    console.log(formatSummaryLine(r, c));
    return;
  }

  console.log(c.bold(`${r.moduleName}: ${r.summary.total} items found`));

  for (const w of r.warnings) {
    console.log(c.yellow(`  Warning: ${w.message}`));
  }

  console.log(c.dim(`  Completed in ${r.durationMs}ms`));

  if (!opts.verbose && r.items.length > 0) {
    console.log(c.dim(`  Run with --verbose to see all items, or --json for structured output.`));
    return;
  }

  if (r.items.length > 0) {
    console.log('');
    const headers = ['FILE', 'LINE', 'SEVERITY', 'MESSAGE'];
    const rows = r.items.map(item => [
      item.file || '-',
      item.line?.toString() || '-',
      item.severity,
      item.message,
    ]);

    const isColor = opts.outputMode !== 'plain';
    const colorizer = isColor
      ? (row: string[], rowIndex: number): string[] => {
          const severity = r.items[rowIndex].severity;
          const colorFn = severityColor[severity](c);
          return row.map(cell => colorFn(cell));
        }
      : undefined;

    console.log(formatTable(headers, rows, c, colorizer));
  }
}

export function formatError(error: { code: string; message: string; suggestion?: string }, c: ChalkInstance): void {
  console.error(c.red(`Error: ${error.message}`));
  if (error.suggestion) {
    console.error(c.dim(`  Suggestion: ${error.suggestion}`));
  }
}
