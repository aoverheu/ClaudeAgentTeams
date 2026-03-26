import type { Module, GitStatsOptions, ModuleOutput, ModuleError } from '../../shared/types.js';

const gitStats: Module<GitStatsOptions> = {
  name: 'git-stats',
  description: 'Show git commit statistics',

  async execute(options): Promise<ModuleOutput> {
    // TODO: Implement in Lesson 4 — use simple-git for commit frequency, contributors
    return {
      moduleName: this.name,
      success: true,
      summary: {
        total: 0,
        bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      },
      items: [],
      warnings: [{ message: 'Module not yet implemented' }],
      durationMs: 0,
    };
  },

  async validate(options): Promise<ModuleError | null> {
    // TODO: Implement in Lesson 4 — check targetPath is a git repo
    return null;
  },
};

export default gitStats;
