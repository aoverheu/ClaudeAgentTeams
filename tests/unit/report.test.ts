import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReportSection, ModuleOptions } from '../../src/shared/types.js';

// Mock all 4 module imports used by the report module
vi.mock('../../src/modules/todo-tracker/index.js', () => ({
  default: {
    name: 'todo-tracker',
    toReportSection: vi.fn(),
  },
}));

vi.mock('../../src/modules/dep-audit/index.js', () => ({
  default: {
    name: 'dep-audit',
    toReportSection: vi.fn(),
  },
}));

vi.mock('../../src/modules/git-stats/index.js', () => ({
  default: {
    name: 'git-stats',
    toReportSection: vi.fn(),
  },
}));

vi.mock('../../src/modules/code-health/index.js', () => ({
  default: {
    name: 'code-health',
    toReportSection: vi.fn(),
  },
}));

import { generateReport } from '../../src/modules/report/index.js';
import todoTracker from '../../src/modules/todo-tracker/index.js';
import depAudit from '../../src/modules/dep-audit/index.js';
import gitStats from '../../src/modules/git-stats/index.js';
import codeHealth from '../../src/modules/code-health/index.js';

const mockSections: ReportSection[] = [
  {
    title: 'TODO Tracker',
    summary: 'Found 5 TODOs, 2 critical',
    items: [
      { label: 'Implement auth', value: 'src/auth.ts:10', severity: 'warning' },
      { label: 'Fix race condition', value: 'src/db.ts:42', severity: 'error' },
    ],
  },
  {
    title: 'Dependency Audit',
    summary: '3 outdated packages',
    items: [
      { label: 'lodash', value: '4.17.20 -> 4.17.21', severity: 'info' },
    ],
  },
  {
    title: 'Git Stats',
    summary: '120 commits in last 30 days',
    items: [],
  },
  {
    title: 'Code Health',
    summary: '2 files exceed complexity threshold',
    items: [
      { label: 'src/parser.ts', value: 'complexity: 25', severity: 'warning' },
    ],
  },
];

function setupMocks() {
  vi.mocked(todoTracker.toReportSection).mockResolvedValue(mockSections[0]);
  vi.mocked(depAudit.toReportSection).mockResolvedValue(mockSections[1]);
  vi.mocked(gitStats.toReportSection).mockResolvedValue(mockSections[2]);
  vi.mocked(codeHealth.toReportSection).mockResolvedValue(mockSections[3]);
}

describe('report — generateReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('assembles sections from all 4 modules', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.sections).toHaveLength(4);
    expect(result.sections[0].title).toBe('TODO Tracker');
    expect(result.sections[1].title).toBe('Dependency Audit');
    expect(result.sections[2].title).toBe('Git Stats');
    expect(result.sections[3].title).toBe('Code Health');
  });

  it('calls each module toReportSection with correct options', async () => {
    await generateReport({ targetPath: '/some/path', verbose: true });

    const expectedOptions: ModuleOptions = {
      targetPath: '/some/path',
      json: false,
      verbose: true,
    };

    expect(todoTracker.toReportSection).toHaveBeenCalledWith(expectedOptions);
    expect(depAudit.toReportSection).toHaveBeenCalledWith(expectedOptions);
    expect(gitStats.toReportSection).toHaveBeenCalledWith(expectedOptions);
    expect(codeHealth.toReportSection).toHaveBeenCalledWith(expectedOptions);
  });

  it('includes generatedAt timestamp', async () => {
    const before = new Date().toISOString();
    const result = await generateReport({ targetPath: '.', verbose: false });
    const after = new Date().toISOString();

    expect(result.generatedAt).toBeDefined();
    expect(result.generatedAt >= before).toBe(true);
    expect(result.generatedAt <= after).toBe(true);
  });

  it('preserves section items in output', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.sections[0].items).toHaveLength(2);
    expect(result.sections[0].items[0].label).toBe('Implement auth');
    expect(result.sections[1].items).toHaveLength(1);
    expect(result.sections[2].items).toHaveLength(0);
    expect(result.sections[3].items).toHaveLength(1);
  });
});

describe('report — Markdown output', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('starts with DevKit Report header', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });
    expect(result.markdown).toMatch(/^# DevKit Report/);
  });

  it('includes Generated timestamp line', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });
    expect(result.markdown).toContain('Generated:');
  });

  it('contains all 4 section headers as h2', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.markdown).toContain('## TODO Tracker');
    expect(result.markdown).toContain('## Dependency Audit');
    expect(result.markdown).toContain('## Git Stats');
    expect(result.markdown).toContain('## Code Health');
  });

  it('includes section summaries', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.markdown).toContain('Found 5 TODOs, 2 critical');
    expect(result.markdown).toContain('3 outdated packages');
    expect(result.markdown).toContain('120 commits in last 30 days');
    expect(result.markdown).toContain('2 files exceed complexity threshold');
  });

  it('formats items as bold label with severity and value', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.markdown).toContain('- **Implement auth** [warning]: src/auth.ts:10');
    expect(result.markdown).toContain('- **Fix race condition** [error]: src/db.ts:42');
    expect(result.markdown).toContain('- **lodash** [info]: 4.17.20 -> 4.17.21');
  });

  it('includes footer with total counts', async () => {
    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.markdown).toContain('**Total sections:** 4');
    expect(result.markdown).toContain('**Total items:** 4');
  });
});

describe('report — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('catches module errors and produces error section', async () => {
    vi.mocked(todoTracker.toReportSection).mockRejectedValue(new Error('Scanner failed'));
    vi.mocked(depAudit.toReportSection).mockResolvedValue(mockSections[1]);
    vi.mocked(gitStats.toReportSection).mockResolvedValue(mockSections[2]);
    vi.mocked(codeHealth.toReportSection).mockResolvedValue(mockSections[3]);

    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.sections).toHaveLength(4);
    expect(result.sections[0].title).toBe('todo-tracker');
    expect(result.sections[0].summary).toBe('Error: Scanner failed');
    expect(result.sections[0].items).toHaveLength(0);
  });

  it('handles non-Error throws gracefully', async () => {
    vi.mocked(todoTracker.toReportSection).mockRejectedValue('string error');
    vi.mocked(depAudit.toReportSection).mockResolvedValue(mockSections[1]);
    vi.mocked(gitStats.toReportSection).mockResolvedValue(mockSections[2]);
    vi.mocked(codeHealth.toReportSection).mockResolvedValue(mockSections[3]);

    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.sections[0].summary).toBe('Error: string error');
  });

  it('continues processing remaining modules after one fails', async () => {
    vi.mocked(todoTracker.toReportSection).mockRejectedValue(new Error('fail'));
    vi.mocked(depAudit.toReportSection).mockRejectedValue(new Error('also fail'));
    vi.mocked(gitStats.toReportSection).mockResolvedValue(mockSections[2]);
    vi.mocked(codeHealth.toReportSection).mockResolvedValue(mockSections[3]);

    const result = await generateReport({ targetPath: '.', verbose: false });

    expect(result.sections).toHaveLength(4);
    expect(result.sections[2].title).toBe('Git Stats');
    expect(result.sections[3].title).toBe('Code Health');
  });
});
