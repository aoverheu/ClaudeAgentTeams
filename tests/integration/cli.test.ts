import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * CLI integration tests — spawns the actual DevKit CLI process
 * and verifies exit codes, output, and --json flag behavior.
 */

const ROOT = process.cwd();

/** Run a CLI command and return { status, stdout, stderr } */
function run(args: string, opts: { cwd?: string } = {}) {
  const result = spawnSync('npx', ['tsx', 'src/index.ts', ...args.split(/\s+/)], {
    cwd: opts.cwd ?? ROOT,
    shell: true,
    timeout: 30_000,
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/** Extract the first JSON object from output (skips non-JSON preamble) */
function extractJson(output: string): unknown {
  const start = output.indexOf('{');
  if (start === -1) {
    const arrStart = output.indexOf('[');
    if (arrStart === -1) throw new Error('No JSON found in output');
    return JSON.parse(output.slice(arrStart));
  }
  return JSON.parse(output.slice(start));
}

describe('CLI — integration', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create a temp directory with a git repo and files so all commands have data
    tempDir = await mkdtemp(join(tmpdir(), 'devkit-cli-'));
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'ignore' });

    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { chalk: '^5.0.0' },
      }),
    );

    await mkdir(join(tempDir, 'src'));
    await writeFile(
      join(tempDir, 'src', 'app.ts'),
      '// TODO: Add error handling\nexport function main() {\n  // FIXME: Hardcoded\n  return 42;\n}\n',
    );
    await writeFile(
      join(tempDir, 'src', 'big.ts'),
      Array.from({ length: 50 }, (_, i) => `const x${i} = ${i};`).join('\n'),
    );

    execSync('git add -A', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit -m "initial"', { cwd: tempDir, stdio: 'ignore' });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  // ── Exit-code smoke tests ──────────────────────────────────────────

  it('todo: runs and exits cleanly', () => {
    const { status } = run(`todo -t ${tempDir}`);
    expect(status).toBe(0);
  });

  it('deps: runs and exits cleanly', () => {
    const { status } = run(`deps -t ${tempDir}`);
    expect(status).toBe(0);
  });

  it('git-stats: runs and exits cleanly', () => {
    const { status } = run(`git-stats -t ${tempDir}`);
    expect(status).toBe(0);
  });

  it('health: runs and exits cleanly', () => {
    const { status } = run(`health -t ${tempDir}`);
    expect(status).toBe(0);
  });

  it('report --stdout: runs and exits cleanly', () => {
    const { status } = run(`report --stdout -t ${tempDir}`);
    expect(status).toBe(0);
  });

  // ── --json flag produces valid JSON ────────────────────────────────

  it('todo --json: output is valid JSON', () => {
    const { stdout, status } = run(`todo --json -t ${tempDir}`);
    expect(status).toBe(0);
    const parsed = extractJson(stdout);
    expect(parsed).toBeDefined();
  });

  it('deps --json: output is valid JSON', () => {
    const { stdout, status } = run(`deps --json -t ${tempDir}`);
    expect(status).toBe(0);
    const parsed = extractJson(stdout);
    expect(parsed).toBeDefined();
  });

  it('git-stats --json: output is valid JSON', () => {
    const { stdout, status } = run(`git-stats --json -t ${tempDir}`);
    expect(status).toBe(0);
    const parsed = extractJson(stdout);
    expect(parsed).toBeDefined();
  });

  it('health --json: output is valid JSON', () => {
    const { stdout, status } = run(`health --json -t ${tempDir}`);
    expect(status).toBe(0);
    const parsed = extractJson(stdout);
    expect(parsed).toBeDefined();
  });

  // ── --help works ───────────────────────────────────────────────────

  it('devkit --help: shows usage', () => {
    const { stdout, status } = run('--help');
    expect(status).toBe(0);
    expect(stdout).toContain('Developer Toolkit CLI');
    expect(stdout).toContain('Usage:');
  });

  it('todo --help: shows todo command options', () => {
    const { stdout, status } = run('todo --help');
    expect(status).toBe(0);
    expect(stdout.toLowerCase()).toContain('todo');
  });

  // ── Unknown command shows helpful error ────────────────────────────

  it('unknown command: shows helpful error', () => {
    const { stderr, stdout } = run('nonexistent-cmd');
    const output = stderr + stdout;
    expect(output).toMatch(/unknown|error|help/i);
  });
});
