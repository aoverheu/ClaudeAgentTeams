import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import todoTracker from '../../src/modules/todo-tracker/index.js';
import type { TodoOptions, ModuleResult } from '../../src/shared/types.js';

function opts(overrides: Partial<TodoOptions> = {}): TodoOptions {
  return { targetPath: '.', json: false, verbose: false, ...overrides };
}

describe('todo-tracker', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devkit-todo-'));

    // Create test files with known comments
    await writeFile(
      join(tempDir, 'app.ts'),
      [
        '// TODO: Implement login feature',
        'const x = 1;',
        '// FIXME: This breaks on edge cases',
        'function hello() {}',
        '// HACK: Temporary workaround for API bug',
      ].join('\n'),
    );

    await writeFile(
      join(tempDir, 'clean.ts'),
      ['const a = 1;', 'const b = 2;', '// Just a normal comment'].join('\n'),
    );

    // Create a nested directory with a file
    await mkdir(join(tempDir, 'sub'));
    await writeFile(
      join(tempDir, 'sub', 'nested.ts'),
      ['// TODO: Handle error case', 'export {};'].join('\n'),
    );

    // Create a node_modules directory that should be ignored
    await mkdir(join(tempDir, 'node_modules'));
    await writeFile(
      join(tempDir, 'node_modules', 'lib.js'),
      '// TODO: This should be ignored',
    );
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // --- validate() ---

  it('validate returns null for valid path', async () => {
    const err = await todoTracker.validate(opts({ targetPath: tempDir }));
    expect(err).toBeNull();
  });

  it('validate returns TARGET_NOT_FOUND for non-existent path', async () => {
    const err = await todoTracker.validate(opts({ targetPath: '/no/such/path/xyz' }));
    expect(err).not.toBeNull();
    expect(err!.code).toBe('TARGET_NOT_FOUND');
  });

  // --- execute() scanning ---

  it('finds all TODO/FIXME/HACK comments in test files', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir }));
    expect(result.success).toBe(true);
    const r = result as ModuleResult;
    // app.ts has 3, sub/nested.ts has 1 = 4 total
    expect(r.summary.total).toBe(4);
  });

  it('skips node_modules directory', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir }));
    expect(result.success).toBe(true);
    const r = result as ModuleResult;
    const nodeModuleItems = r.items.filter((i) => i.file?.includes('node_modules'));
    expect(nodeModuleItems).toHaveLength(0);
  });

  it('includes correct file paths and line numbers', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir }));
    const r = result as ModuleResult;
    const todoItem = r.items.find((i) => i.message.includes('Implement login'));
    expect(todoItem).toBeDefined();
    expect(todoItem!.file).toBe('app.ts');
    expect(todoItem!.line).toBe(1);
  });

  // --- tag filtering ---

  it('filters by tag=TODO', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir, tag: 'TODO' }));
    const r = result as ModuleResult;
    expect(r.summary.total).toBe(2); // app.ts TODO + sub/nested.ts TODO
    for (const item of r.items) {
      expect(item.meta?.tag).toBe('TODO');
    }
  });

  it('filters by tag=FIXME', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir, tag: 'FIXME' }));
    const r = result as ModuleResult;
    expect(r.summary.total).toBe(1);
    expect(r.items[0].meta?.tag).toBe('FIXME');
  });

  it('filters by tag=HACK', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir, tag: 'HACK' }));
    const r = result as ModuleResult;
    expect(r.summary.total).toBe(1);
    expect(r.items[0].meta?.tag).toBe('HACK');
  });

  it('tag=all returns everything', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir, tag: 'all' }));
    const r = result as ModuleResult;
    expect(r.summary.total).toBe(4);
  });

  // --- severity mapping ---

  it('maps TODO to info, FIXME/HACK to warning', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir }));
    const r = result as ModuleResult;
    const todoItem = r.items.find((i) => i.meta?.tag === 'TODO');
    const fixmeItem = r.items.find((i) => i.meta?.tag === 'FIXME');
    const hackItem = r.items.find((i) => i.meta?.tag === 'HACK');
    expect(todoItem!.severity).toBe('info');
    expect(fixmeItem!.severity).toBe('warning');
    expect(hackItem!.severity).toBe('warning');
  });

  // --- summary counts ---

  it('produces correct bySeverity counts', async () => {
    const result = await todoTracker.execute(opts({ targetPath: tempDir }));
    const r = result as ModuleResult;
    expect(r.summary.bySeverity.info).toBe(2);    // 2 TODOs
    expect(r.summary.bySeverity.warning).toBe(2);  // 1 FIXME + 1 HACK
    expect(r.summary.bySeverity.error).toBe(0);
    expect(r.summary.bySeverity.critical).toBe(0);
  });

  // --- existing smoke test compat ---

  it('works with cwd as target (smoke test compat)', async () => {
    const result = await todoTracker.execute(opts({ targetPath: '.' }));
    expect(result.success).toBe(true);
    expect(result.moduleName).toBe('todo-tracker');
  });
});
