import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GitStatsOptions } from '../../src/shared/types.js';

// Mock simple-git before importing the module
const mockLog = vi.fn();
const mockCheckIsRepo = vi.fn();
const mockDiffSummary = vi.fn();

vi.mock('simple-git', () => ({
  simpleGit: () => ({
    log: mockLog,
    checkIsRepo: mockCheckIsRepo,
    diffSummary: mockDiffSummary,
  }),
}));

// Mock fs.existsSync
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

import gitStats from '../../src/modules/git-stats/index.js';
import { existsSync } from 'fs';
import { ModuleErrorCode } from '../../src/shared/types.js';

const baseOptions: GitStatsOptions = {
  targetPath: '/fake/repo',
  json: false,
  verbose: false,
};

function makeCommit(author: string, date: string, hash: string) {
  return {
    hash,
    date,
    message: 'some commit',
    refs: '',
    body: '',
    author_name: author,
    author_email: `${author.toLowerCase().replace(' ', '.')}@example.com`,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(existsSync).mockReturnValue(true);
  mockDiffSummary.mockRejectedValue(new Error('no parent'));
});

describe('git-stats validate', () => {
  it('returns TARGET_NOT_FOUND when path does not exist', async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const error = await gitStats.validate(baseOptions);
    expect(error).not.toBeNull();
    expect(error!.code).toBe(ModuleErrorCode.TARGET_NOT_FOUND);
  });

  it('returns NOT_A_GIT_REPO when not a git repo', async () => {
    mockCheckIsRepo.mockResolvedValue(false);
    const error = await gitStats.validate(baseOptions);
    expect(error).not.toBeNull();
    expect(error!.code).toBe(ModuleErrorCode.NOT_A_GIT_REPO);
  });

  it('returns null for a valid git repo', async () => {
    mockCheckIsRepo.mockResolvedValue(true);
    const error = await gitStats.validate(baseOptions);
    expect(error).toBeNull();
  });
});

describe('git-stats execute', () => {
  it('returns empty result when no commits found', async () => {
    mockLog.mockResolvedValue({ all: [] });
    const result = await gitStats.execute(baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.summary.totalCommits).toBe(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toMatch(/no commits/i);
    }
  });

  it('calculates contributor stats correctly', async () => {
    mockLog.mockResolvedValue({
      all: [
        makeCommit('Alice', '2026-03-20T10:00:00Z', 'aaa'),
        makeCommit('Alice', '2026-03-21T10:00:00Z', 'bbb'),
        makeCommit('Bob', '2026-03-22T10:00:00Z', 'ccc'),
      ],
    });

    const result = await gitStats.execute(baseOptions);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.summary.totalCommits).toBe(3);
    expect(result.summary.contributorCount).toBe(2);

    // Alice should be first (2 commits > 1)
    const aliceItem = result.items.find(i => i.meta?.author === 'Alice');
    expect(aliceItem).toBeDefined();
    expect(aliceItem!.meta!.commits).toBe(2);
    expect(aliceItem!.meta!.percentage).toBeCloseTo(66.7, 0);

    const bobItem = result.items.find(i => i.meta?.author === 'Bob');
    expect(bobItem).toBeDefined();
    expect(bobItem!.meta!.commits).toBe(1);
  });

  it('respects --top-n limiting', async () => {
    mockLog.mockResolvedValue({
      all: [
        makeCommit('Alice', '2026-03-20T10:00:00Z', 'aaa'),
        makeCommit('Bob', '2026-03-21T10:00:00Z', 'bbb'),
        makeCommit('Charlie', '2026-03-22T10:00:00Z', 'ccc'),
      ],
    });

    const result = await gitStats.execute({ ...baseOptions, topN: 2 });
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Only 2 contributor items (active-file items may exist too)
    const contributorItems = result.items.filter(i => i.meta?.author);
    expect(contributorItems).toHaveLength(2);
  });

  it('passes --since and --until to simple-git log', async () => {
    mockLog.mockResolvedValue({ all: [] });

    await gitStats.execute({
      ...baseOptions,
      since: '2026-01-01',
      until: '2026-03-01',
    });

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        '--since': '2026-01-01',
        '--until': '2026-03-01',
      }),
    );
  });

  it('passes --author filter to simple-git log', async () => {
    mockLog.mockResolvedValue({ all: [] });

    await gitStats.execute({ ...baseOptions, author: 'Alice' });

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ '--author': 'Alice' }),
    );
  });

  it('calculates commit frequency', async () => {
    // 3 commits over 7 days
    mockLog.mockResolvedValue({
      all: [
        makeCommit('Alice', '2026-03-20T10:00:00Z', 'aaa'),
        makeCommit('Alice', '2026-03-23T10:00:00Z', 'bbb'),
        makeCommit('Alice', '2026-03-27T10:00:00Z', 'ccc'),
      ],
    });

    const result = await gitStats.execute(baseOptions);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.summary.commitsPerDay).toBeGreaterThan(0);
    expect(result.summary.commitsPerWeek).toBeGreaterThan(0);
    expect(result.summary.daySpan).toBe(7);
  });

  it('includes active files when diffSummary succeeds', async () => {
    mockLog.mockResolvedValue({
      all: [makeCommit('Alice', '2026-03-20T10:00:00Z', 'aaa')],
    });
    mockDiffSummary.mockResolvedValue({
      files: [{ file: 'src/index.ts' }, { file: 'README.md' }],
    });

    const result = await gitStats.execute(baseOptions);
    expect(result.success).toBe(true);
    if (!result.success) return;

    const fileItems = result.items.filter(i => i.meta?.category === 'active-file');
    expect(fileItems).toHaveLength(2);
  });

  it('returns INTERNAL_ERROR on unexpected failure', async () => {
    mockLog.mockRejectedValue(new Error('git exploded'));

    const result = await gitStats.execute(baseOptions);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe(ModuleErrorCode.INTERNAL_ERROR);
  });
});
