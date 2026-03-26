import { existsSync } from 'fs';
import { simpleGit } from 'simple-git';
import type { Module, GitStatsOptions, ModuleOutput, ModuleError, ResultItem, Severity } from '../../shared/types.js';
import { ModuleErrorCode } from '../../shared/types.js';

const gitStats: Module<GitStatsOptions> = {
  name: 'git-stats',
  description: 'Show git commit statistics',

  async validate(options): Promise<ModuleError | null> {
    if (!existsSync(options.targetPath)) {
      return {
        code: ModuleErrorCode.TARGET_NOT_FOUND,
        message: `Target path does not exist: ${options.targetPath}`,
        suggestion: 'Check the path and try again.',
      };
    }

    const git = simpleGit(options.targetPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return {
        code: ModuleErrorCode.NOT_A_GIT_REPO,
        message: `Not a git repository: ${options.targetPath}`,
        suggestion: 'Run "git init" or point to a directory with a .git folder.',
      };
    }

    return null;
  },

  async execute(options): Promise<ModuleOutput> {
    const startTime = Date.now();
    const git = simpleGit(options.targetPath);

    try {
      // Build log options
      const logOptions: Record<string, string | number | undefined> = {};
      if (options.since) logOptions['--since'] = options.since;
      if (options.until) logOptions['--until'] = options.until;
      if (options.author) logOptions['--author'] = options.author;

      const log = await git.log(logOptions);
      const commits = log.all;

      if (commits.length === 0) {
        return {
          moduleName: this.name,
          success: true,
          summary: {
            total: 0,
            bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
            totalCommits: 0,
            contributorCount: 0,
          },
          items: [],
          warnings: [{ message: 'No commits found in the specified range.' }],
          durationMs: Date.now() - startTime,
        };
      }

      // Count commits per contributor
      const contributorMap = new Map<string, { commits: number; latestDate: string }>();
      for (const commit of commits) {
        const author = commit.author_name;
        const existing = contributorMap.get(author);
        if (existing) {
          existing.commits++;
          if (commit.date > existing.latestDate) {
            existing.latestDate = commit.date;
          }
        } else {
          contributorMap.set(author, { commits: 1, latestDate: commit.date });
        }
      }

      // Sort by commit count descending, limit to topN
      const topN = options.topN ?? 10;
      const sorted = [...contributorMap.entries()]
        .sort((a, b) => b[1].commits - a[1].commits)
        .slice(0, topN);

      // Calculate commit frequency
      const dates = commits.map(c => new Date(c.date).getTime());
      const earliest = Math.min(...dates);
      const latest = Math.max(...dates);
      const daySpan = Math.max(1, Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)));
      const weekSpan = Math.max(1, Math.ceil(daySpan / 7));
      const commitsPerDay = +(commits.length / daySpan).toFixed(2);
      const commitsPerWeek = +(commits.length / weekSpan).toFixed(2);

      // Track most recently active files via diff summaries
      const fileActivityMap = new Map<string, number>();
      // Use the most recent commits (up to 50) to gather file activity
      const recentCommits = commits.slice(0, 50);
      for (const commit of recentCommits) {
        try {
          const diff = await git.diffSummary([`${commit.hash}^`, commit.hash]);
          for (const file of diff.files) {
            fileActivityMap.set(file.file, (fileActivityMap.get(file.file) ?? 0) + 1);
          }
        } catch {
          // First commit or merge commit — skip
        }
      }

      const topFiles = [...fileActivityMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Build result items — one per contributor
      const items: ResultItem[] = sorted.map(([author, stats]) => {
        const percentage = ((stats.commits / commits.length) * 100).toFixed(1);
        return {
          severity: 'info' as Severity,
          message: `${author}: ${stats.commits} commits (${percentage}%)`,
          meta: {
            author,
            commits: stats.commits,
            percentage: parseFloat(percentage),
            latestDate: stats.latestDate,
          },
        };
      });

      // Add active files as info items
      for (const [file, changeCount] of topFiles) {
        items.push({
          file,
          severity: 'info' as Severity,
          message: `Changed ${changeCount} times in recent commits`,
          meta: { changeCount, category: 'active-file' },
        });
      }

      return {
        moduleName: this.name,
        success: true,
        summary: {
          total: items.length,
          bySeverity: { info: items.length, warning: 0, error: 0, critical: 0 },
          totalCommits: commits.length,
          contributorCount: contributorMap.size,
          commitsPerDay,
          commitsPerWeek,
          daySpan,
        },
        items,
        warnings: [],
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        moduleName: this.name,
        success: false,
        error: {
          code: ModuleErrorCode.INTERNAL_ERROR,
          message: `Failed to gather git stats: ${err instanceof Error ? err.message : String(err)}`,
          suggestion: 'Ensure git is installed and the target path is a valid repository.',
        },
      };
    }
  },
};

export default gitStats;
