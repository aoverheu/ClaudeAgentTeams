import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Chalk } from 'chalk';
import type { ModuleResult, ModuleErrorResult } from '../../src/shared/types.js';
import {
  formatOutput,
  formatError,
  formatSummaryLine,
  formatTable,
  resolveOutputMode,
  createChalk,
  type FormatOptions,
} from '../../src/shared/formatter.js';

const makeResult = (overrides: Partial<ModuleResult> = {}): ModuleResult => ({
  moduleName: 'test-module',
  success: true as const,
  summary: { total: 3, bySeverity: { info: 1, warning: 1, error: 0, critical: 1 } },
  items: [
    { severity: 'info', message: 'info item', file: 'a.ts', line: 1 },
    { severity: 'warning', message: 'warn item', file: 'b.ts', line: 2 },
    { severity: 'critical', message: 'crit item', file: 'c.ts', line: 3 },
  ],
  warnings: [],
  durationMs: 42,
  ...overrides,
});

describe('formatter', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('JSON mode', () => {
    it('outputs valid JSON containing the result', () => {
      const result = makeResult();
      const opts: FormatOptions = {
        outputMode: 'json',
        verbose: false,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(result, opts);

      expect(logSpy).toHaveBeenCalledOnce();
      const output = logSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.moduleName).toBe('test-module');
      expect(parsed.success).toBe(true);
      expect(parsed.items).toHaveLength(3);
    });
  });

  describe('table mode (verbose)', () => {
    it('outputs item messages when verbose is true', () => {
      const result = makeResult();
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: true,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(result, opts);

      const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('info item');
      expect(allOutput).toContain('warn item');
      expect(allOutput).toContain('crit item');
    });
  });

  describe('table mode (non-verbose)', () => {
    it('shows verbose hint and no item details', () => {
      const result = makeResult();
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: false,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(result, opts);

      const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('Run with --verbose');
      expect(allOutput).not.toContain('info item');
    });
  });

  describe('severity colors', () => {
    it('applies ANSI red for critical items in color mode', () => {
      const result = makeResult({
        items: [{ severity: 'critical', message: 'critical thing', file: 'x.ts', line: 1 }],
        summary: { total: 1, bySeverity: { info: 0, warning: 0, error: 0, critical: 1 } },
      });
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: true,
        chalk: new Chalk({ level: 1 }),
      };

      formatOutput(result, opts);

      const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      // ANSI red escape: \x1b[31m
      expect(allOutput).toContain('\x1b[31m');
    });

    it('does not include ANSI codes in plain mode', () => {
      const result = makeResult({
        items: [{ severity: 'critical', message: 'critical thing', file: 'x.ts', line: 1 }],
        summary: { total: 1, bySeverity: { info: 0, warning: 0, error: 0, critical: 1 } },
      });
      const opts: FormatOptions = {
        outputMode: 'plain',
        verbose: true,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(result, opts);

      const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).not.toContain('\x1b[');
    });
  });

  describe('summary mode', () => {
    it('outputs only the summary line, not the full table', () => {
      const result = makeResult();
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: true,
        summary: true,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(result, opts);

      expect(logSpy).toHaveBeenCalledOnce();
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('test-module');
      expect(output).toContain('3 items');
      // Should not contain table headers or item details
      expect(output).not.toContain('FILE');
      expect(output).not.toContain('info item');
    });
  });

  describe('empty items', () => {
    it('shows header and duration but no table or hint when items is empty', () => {
      const result = makeResult({
        items: [],
        summary: { total: 0, bySeverity: { info: 0, warning: 0, error: 0, critical: 0 } },
      });
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: false,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(result, opts);

      const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allOutput).toContain('0 items found');
      expect(allOutput).toContain('Completed in');
      expect(allOutput).not.toContain('Run with --verbose');
      expect(allOutput).not.toContain('FILE');
    });
  });

  describe('error formatting', () => {
    it('calls formatError path for failed results', () => {
      const errorResult: ModuleErrorResult = {
        moduleName: 'test-module',
        success: false,
        error: { code: 'TARGET_NOT_FOUND' as const, message: 'Path not found' },
      };
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: false,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(errorResult, opts);

      const allErrorOutput = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allErrorOutput).toContain('Path not found');
      // console.log should NOT have been called with table data
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('displays suggestion when present', () => {
      const errorResult: ModuleErrorResult = {
        moduleName: 'test-module',
        success: false,
        error: {
          code: 'TARGET_NOT_FOUND' as const,
          message: 'Path not found',
          suggestion: 'Check the directory exists',
        },
      };
      const opts: FormatOptions = {
        outputMode: 'color',
        verbose: false,
        chalk: new Chalk({ level: 0 }),
      };

      formatOutput(errorResult, opts);

      const allErrorOutput = errorSpy.mock.calls.map(c => c[0]).join('\n');
      expect(allErrorOutput).toContain('Path not found');
      expect(allErrorOutput).toContain('Check the directory exists');
    });
  });

  describe('formatTable', () => {
    it('renders header and separator with no data lines when rows is empty', () => {
      const c = new Chalk({ level: 0 });
      const output = formatTable(['NAME', 'VALUE'], [], c);
      const lines = output.split('\n');
      expect(lines).toHaveLength(2); // header + separator
      expect(lines[0]).toContain('NAME');
      expect(lines[1]).toMatch(/^-+/);
    });
  });

  describe('resolveOutputMode', () => {
    it('returns json when json option is true', () => {
      expect(resolveOutputMode({ json: true })).toBe('json');
    });

    it('returns plain when color is false', () => {
      expect(resolveOutputMode({ color: false })).toBe('plain');
    });

    it('returns color by default', () => {
      const orig = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      expect(resolveOutputMode({})).toBe('color');
      if (orig !== undefined) process.env.NO_COLOR = orig;
    });
  });

  describe('createChalk', () => {
    it('returns level 0 chalk for plain mode', () => {
      const c = createChalk('plain');
      // level 0 means no color — coloring functions return input unchanged
      expect(c.red('test')).toBe('test');
    });

    it('returns a chalk instance for color mode', () => {
      const c = createChalk('color');
      expect(c).toBeDefined();
    });
  });

  describe('formatSummaryLine', () => {
    it('returns string with module name and item count', () => {
      const result = makeResult();
      const c = new Chalk({ level: 0 });
      const line = formatSummaryLine(result, c);

      expect(line).toContain('test-module');
      expect(line).toContain('3 items');
    });

    it('shows green "ok" when no critical/error items', () => {
      const result = makeResult({
        summary: { total: 2, bySeverity: { info: 1, warning: 1, error: 0, critical: 0 } },
      });
      const c = new Chalk({ level: 1 });
      const line = formatSummaryLine(result, c);

      // Green ANSI: \x1b[32m
      expect(line).toContain('\x1b[32m');
      expect(line).toContain('ok');
    });

    it('shows red "needs attention" when critical > 0', () => {
      const result = makeResult({
        summary: { total: 3, bySeverity: { info: 1, warning: 1, error: 0, critical: 1 } },
      });
      const c = new Chalk({ level: 1 });
      const line = formatSummaryLine(result, c);

      // Red ANSI: \x1b[31m
      expect(line).toContain('\x1b[31m');
      expect(line).toContain('needs attention');
    });

    it('shows red "needs attention" when error > 0', () => {
      const result = makeResult({
        summary: { total: 2, bySeverity: { info: 1, warning: 0, error: 1, critical: 0 } },
      });
      const c = new Chalk({ level: 1 });
      const line = formatSummaryLine(result, c);

      expect(line).toContain('\x1b[31m');
      expect(line).toContain('needs attention');
    });
  });
});
