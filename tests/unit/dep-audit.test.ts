import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { DepAuditOptions, ModuleResult, ModuleErrorResult } from '../../src/shared/types.js';

// Mock fs modules
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import module after mocks are set up
const { default: depAudit } = await import('../../src/modules/dep-audit/index.js');

function makeOptions(overrides: Partial<DepAuditOptions> = {}): DepAuditOptions {
  return {
    targetPath: '/test/project',
    json: false,
    verbose: false,
    ...overrides,
  };
}

function makeFetchResponse(version: string, deprecated?: string) {
  return {
    ok: true,
    json: async () => ({ version, deprecated }),
  };
}

const samplePackageJson = JSON.stringify({
  name: 'test-project',
  dependencies: {
    chalk: '^5.0.0',
    commander: '^11.0.0',
  },
  devDependencies: {
    vitest: '^1.0.0',
    typescript: '^5.0.0',
  },
});

describe('dep-audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validate()', () => {
    it('returns TARGET_NOT_FOUND when path does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const error = await depAudit.validate(makeOptions());
      expect(error).not.toBeNull();
      expect(error!.code).toBe('TARGET_NOT_FOUND');
    });

    it('returns NO_PACKAGE_JSON when package.json is missing', async () => {
      vi.mocked(existsSync).mockImplementation((p: unknown) => {
        // targetPath exists, but package.json does not
        return !String(p).includes('package.json');
      });
      const error = await depAudit.validate(makeOptions());
      expect(error).not.toBeNull();
      expect(error!.code).toBe('NO_PACKAGE_JSON');
    });

    it('returns null when targetPath and package.json both exist', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const error = await depAudit.validate(makeOptions());
      expect(error).toBeNull();
    });
  });

  describe('execute()', () => {
    beforeEach(() => {
      vi.mocked(readFile).mockResolvedValue(samplePackageJson);
    });

    it('detects outdated packages with correct severity', async () => {
      // chalk: ^5.0.0 -> 5.6.2 = minor update (warning)
      // commander: ^11.0.0 -> 14.0.3 = major update (error)
      // vitest: ^1.0.0 -> 4.1.2 = major update (error)
      // typescript: ^5.0.0 -> 6.0.2 = major update (error)
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse('5.6.2'))   // chalk
        .mockResolvedValueOnce(makeFetchResponse('14.0.3'))  // commander
        .mockResolvedValueOnce(makeFetchResponse('4.1.2'))   // vitest
        .mockResolvedValueOnce(makeFetchResponse('6.0.2'));  // typescript

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(4);

      const chalk = result.items.find(i => (i.meta?.package as string) === 'chalk');
      expect(chalk?.severity).toBe('warning'); // minor behind

      const commander = result.items.find(i => (i.meta?.package as string) === 'commander');
      expect(commander?.severity).toBe('error'); // major behind
    });

    it('detects patch-level updates as info', async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: { lodash: '4.17.20' },
      }));
      mockFetch.mockResolvedValueOnce(makeFetchResponse('4.17.21'));

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(1);
      expect(result.items[0].severity).toBe('info');
    });

    it('skips up-to-date packages', async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: { lodash: '4.17.21' },
      }));
      mockFetch.mockResolvedValueOnce(makeFetchResponse('4.17.21'));

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(0);
    });

    it('flags deprecated packages as critical', async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: { 'old-pkg': '1.0.0' },
      }));
      mockFetch.mockResolvedValueOnce(makeFetchResponse('1.0.1', 'Use new-pkg instead'));

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(1);
      expect(result.items[0].severity).toBe('critical');
      expect(result.items[0].meta?.deprecated).toBe(true);
    });

    it('respects --prod-only flag', async () => {
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse('5.6.2'))   // chalk
        .mockResolvedValueOnce(makeFetchResponse('14.0.3')); // commander

      const result = await depAudit.execute(makeOptions({ prodOnly: true })) as ModuleResult;
      expect(result.success).toBe(true);
      // Should only check chalk and commander (prod deps), not vitest/typescript
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('respects --dev-only flag', async () => {
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse('4.1.2'))  // vitest
        .mockResolvedValueOnce(makeFetchResponse('6.0.2')); // typescript

      const result = await depAudit.execute(makeOptions({ devOnly: true })) as ModuleResult;
      expect(result.success).toBe(true);
      // Should only check vitest and typescript (dev deps)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('filters by --severity threshold', async () => {
      // chalk: minor update = warning, commander: major = error
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse('5.6.2'))   // chalk -> warning
        .mockResolvedValueOnce(makeFetchResponse('14.0.3'))  // commander -> error
        .mockResolvedValueOnce(makeFetchResponse('4.1.2'))   // vitest -> error
        .mockResolvedValueOnce(makeFetchResponse('6.0.2'));  // typescript -> error

      const result = await depAudit.execute(makeOptions({ severity: 'high' })) as ModuleResult;
      expect(result.success).toBe(true);
      // 'high' maps to 'error' and above — chalk (warning) should be filtered out
      expect(result.items.every(i => i.severity === 'error' || i.severity === 'critical')).toBe(true);
      expect(result.items.find(i => (i.meta?.package as string) === 'chalk')).toBeUndefined();
    });

    it('handles network errors gracefully with warnings', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))  // chalk fails
        .mockResolvedValueOnce(makeFetchResponse('14.0.3'))   // commander works
        .mockResolvedValueOnce(makeFetchResponse('4.1.2'))    // vitest works
        .mockResolvedValueOnce(makeFetchResponse('6.0.2'));   // typescript works

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true); // doesn't fail entirely
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('chalk');
    });

    it('handles HTTP error responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        dependencies: { 'nonexistent-pkg': '1.0.0' },
      }));

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].message).toContain('404');
    });

    it('returns correct summary counts', async () => {
      mockFetch
        .mockResolvedValueOnce(makeFetchResponse('5.6.2'))   // chalk -> warning
        .mockResolvedValueOnce(makeFetchResponse('14.0.3'))  // commander -> error
        .mockResolvedValueOnce(makeFetchResponse('4.1.2'))   // vitest -> error
        .mockResolvedValueOnce(makeFetchResponse('6.0.2'));  // typescript -> error

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.summary.total).toBe(4);
      expect(result.summary.bySeverity.warning).toBe(1);
      expect(result.summary.bySeverity.error).toBe(3);
    });

    it('returns error result when package.json cannot be parsed', async () => {
      vi.mocked(readFile).mockResolvedValue('not valid json');

      const result = await depAudit.execute(makeOptions()) as ModuleErrorResult;
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });

    it('handles empty dependencies gracefully', async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({ name: 'empty' }));

      const result = await depAudit.execute(makeOptions()) as ModuleResult;
      expect(result.success).toBe(true);
      expect(result.items.length).toBe(0);
      expect(result.summary.total).toBe(0);
    });
  });
});
