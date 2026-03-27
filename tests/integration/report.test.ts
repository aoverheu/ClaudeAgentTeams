import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { generateReport } from '../../src/modules/report/index.js';

describe('report — integration', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'devkit-report-'));

    // Initialize a git repo so git-stats can run
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    // Create a package.json for dep-audit
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { chalk: '^5.0.0' },
      }),
    );

    // Create source files with TODO comments for todo-tracker
    await mkdir(join(tempDir, 'src'));
    await writeFile(
      join(tempDir, 'src', 'app.ts'),
      [
        '// TODO: Add error handling',
        'export function main() {',
        '  // FIXME: Hardcoded value',
        '  return 42;',
        '}',
      ].join('\n'),
    );

    // Create a large-ish file for code-health to analyze
    await writeFile(
      join(tempDir, 'src', 'big.ts'),
      Array.from({ length: 50 }, (_, i) => `const x${i} = ${i};`).join('\n'),
    );

    // Make an initial commit so git-stats has data
    execSync('git add -A', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('generates a full report with all 4 sections', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });

    expect(result.sections).toHaveLength(4);
    expect(result.markdown).toBeDefined();
    expect(result.generatedAt).toBeDefined();
  });

  it('report contains all 4 module section headers', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });

    const titles = result.sections.map((s) => s.title);
    expect(titles).toContain('TODO Tracker');
    expect(titles).toContain('Dependency Audit');
    expect(titles).toContain('Git Stats');
    expect(titles).toContain('Code Health');
  });

  it('markdown output contains all section headers as h2', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });

    expect(result.markdown).toContain('## TODO Tracker');
    expect(result.markdown).toContain('## Dependency Audit');
    expect(result.markdown).toContain('## Git Stats');
    expect(result.markdown).toContain('## Code Health');
  });

  it('each section has a non-empty summary', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });

    for (const section of result.sections) {
      expect(section.summary).toBeTruthy();
      expect(section.summary.length).toBeGreaterThan(0);
    }
  });

  it('todo-tracker section finds TODOs from test files', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });

    const todoSection = result.sections.find((s) => s.title === 'TODO Tracker');
    expect(todoSection).toBeDefined();
    expect(todoSection!.items.length).toBeGreaterThan(0);
  });

  it('writes report to file when saved manually', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });
    const outputPath = join(tempDir, 'devkit-report.md');

    await writeFile(outputPath, result.markdown, 'utf-8');

    const content = await readFile(outputPath, 'utf-8');
    expect(content).toContain('# DevKit Report');
    expect(content).toContain('## TODO Tracker');
    expect(content).toContain('## Dependency Audit');
    expect(content).toContain('## Git Stats');
    expect(content).toContain('## Code Health');
  });

  it('markdown footer shows correct section count', async () => {
    const result = await generateReport({ targetPath: tempDir, verbose: false });

    expect(result.markdown).toContain('**Total sections:** 4');
  });
});
