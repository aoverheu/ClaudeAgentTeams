import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import codeHealth from '../../src/modules/code-health/index.js';
import type { CodeHealthOptions, ModuleResult } from '../../src/shared/types.js';

function makeOptions(overrides: Partial<CodeHealthOptions> = {}): CodeHealthOptions {
  return {
    targetPath: '.',
    json: false,
    verbose: false,
    ...overrides,
  };
}

describe('code-health module', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'devkit-health-'));

    // Create a src/ directory with source files
    await mkdir(join(tmpDir, 'src'), { recursive: true });
    await mkdir(join(tmpDir, 'src', 'utils'), { recursive: true });
    await mkdir(join(tmpDir, 'tests'), { recursive: true });

    // Small file (5 lines)
    await writeFile(join(tmpDir, 'src', 'small.ts'), [
      'export function add(a: number, b: number): number {',
      '  return a + b;',
      '}',
      '',
      'export default add;',
    ].join('\n'));

    // Large file (exceeds default 500 lines, we'll test with threshold=10)
    const largeLines = Array.from({ length: 20 }, (_, i) => `const x${i} = ${i};`);
    await writeFile(join(tmpDir, 'src', 'large.ts'), largeLines.join('\n'));

    // Complex file with many branching statements
    await writeFile(join(tmpDir, 'src', 'utils', 'complex.ts'), [
      'export function process(x: number): string {',
      '  if (x > 100) {',
      '    if (x > 200) {',
      '      return "huge";',
      '    } else if (x > 150) {',
      '      return "big";',
      '    }',
      '  }',
      '  for (let i = 0; i < x; i++) {',
      '    while (i > 0 && i < 5) {',
      '      try {',
      '        const val = x > 50 ? "high" : "low";',
      '      } catch (e) {',
      '        console.log(e);',
      '      }',
      '    }',
      '  }',
      '  switch (x) {',
      '    case 1: return "one";',
      '    case 2: return "two";',
      '    case 3: return "three";',
      '    default: return "other";',
      '  }',
      '}',
    ].join('\n'));

    // A test file for small.ts
    await writeFile(join(tmpDir, 'tests', 'small.test.ts'), [
      'import { add } from "../src/small";',
      'test("adds", () => expect(add(1,2)).toBe(3));',
    ].join('\n'));

    // A JSON config file
    await writeFile(join(tmpDir, 'package.json'), '{ "name": "test" }');
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('validate()', () => {
    it('returns null for valid path', async () => {
      const err = await codeHealth.validate(makeOptions({ targetPath: tmpDir }));
      expect(err).toBeNull();
    });

    it('returns TARGET_NOT_FOUND for non-existent path', async () => {
      const err = await codeHealth.validate(makeOptions({ targetPath: '/nonexistent/path/xyz' }));
      expect(err).not.toBeNull();
      expect(err!.code).toBe('TARGET_NOT_FOUND');
    });
  });

  describe('execute()', () => {
    it('scans directory and counts files by extension', async () => {
      const result = await codeHealth.execute(makeOptions({ targetPath: tmpDir }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      const fileCountItems = r.items.filter((i) => i.meta?.type === 'file-count');
      expect(fileCountItems.length).toBeGreaterThan(0);

      // Should find .ts files
      const tsItem = fileCountItems.find((i) => i.meta?.extension === '.ts');
      expect(tsItem).toBeDefined();
      expect((tsItem!.meta!.fileCount as number)).toBeGreaterThanOrEqual(3);
    });

    it('detects large files with custom threshold', async () => {
      const result = await codeHealth.execute(makeOptions({
        targetPath: tmpDir,
        maxFileSize: 10,
      }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      const largeFileItems = r.items.filter((i) => i.meta?.type === 'large-file');
      expect(largeFileItems.length).toBeGreaterThanOrEqual(1);

      // large.ts has 20 lines, should be flagged with threshold 10
      const largeFile = largeFileItems.find((i) => i.file?.includes('large.ts'));
      expect(largeFile).toBeDefined();
      expect(largeFile!.severity).toBe('warning');
    });

    it('counts complexity and flags high-complexity files', async () => {
      const result = await codeHealth.execute(makeOptions({
        targetPath: tmpDir,
        maxComplexity: 3,
      }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      const complexItems = r.items.filter((i) => i.meta?.type === 'complexity');
      expect(complexItems.length).toBeGreaterThanOrEqual(1);

      const complexFile = complexItems.find((i) => i.file?.includes('complex.ts'));
      expect(complexFile).toBeDefined();
    });

    it('flags error severity when complexity exceeds 2x threshold', async () => {
      const result = await codeHealth.execute(makeOptions({
        targetPath: tmpDir,
        maxComplexity: 2, // complex.ts should be well above 4
      }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      const complexFile = r.items.find(
        (i) => i.meta?.type === 'complexity' && i.file?.includes('complex.ts'),
      );
      expect(complexFile).toBeDefined();
      expect(complexFile!.severity).toBe('error');
    });

    it('detects missing test files', async () => {
      const result = await codeHealth.execute(makeOptions({ targetPath: tmpDir }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      const missingTestItems = r.items.filter((i) => i.meta?.type === 'missing-test');

      // large.ts and complex.ts should not have tests; small.ts has a test
      const hasLargeNoTest = missingTestItems.some((i) => i.file?.includes('large.ts'));
      const hasSmallNoTest = missingTestItems.some((i) => i.file?.includes('small.ts'));
      expect(hasLargeNoTest).toBe(true);
      expect(hasSmallNoTest).toBe(false);
    });

    it('excludes directories like node_modules', async () => {
      // Create a node_modules file that should be skipped
      await mkdir(join(tmpDir, 'node_modules', 'pkg'), { recursive: true });
      await writeFile(join(tmpDir, 'node_modules', 'pkg', 'index.ts'), 'export default 1;');

      const result = await codeHealth.execute(makeOptions({ targetPath: tmpDir }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      const nodeModuleItems = r.items.filter(
        (i) => i.file?.includes('node_modules'),
      );
      expect(nodeModuleItems).toHaveLength(0);
    });

    it('returns proper summary with totalFiles and totalLines', async () => {
      const result = await codeHealth.execute(makeOptions({ targetPath: tmpDir }));
      expect(result.success).toBe(true);

      const r = result as ModuleResult;
      expect(r.summary.totalFiles).toBeGreaterThan(0);
      expect(r.summary.totalLines).toBeGreaterThan(0);
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
