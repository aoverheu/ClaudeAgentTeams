import type { Module, CodeHealthOptions, ModuleOutput, ModuleError } from '../../shared/types.js';

const codeHealth: Module<CodeHealthOptions> = {
  name: 'code-health',
  description: 'Report code health metrics',

  async execute(options): Promise<ModuleOutput> {
    // TODO: Implement in Lesson 4 — report file sizes, complexity, test coverage gaps
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
    // TODO: Implement in Lesson 4 — check targetPath exists
    return null;
  },
};

export default codeHealth;
