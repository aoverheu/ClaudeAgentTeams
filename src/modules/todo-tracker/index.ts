import type { Module, TodoOptions, ModuleOutput, ModuleError } from '../../shared/types.js';

const todoTracker: Module<TodoOptions> = {
  name: 'todo-tracker',
  description: 'Scan codebase for TODO/FIXME/HACK comments',

  async execute(options): Promise<ModuleOutput> {
    // TODO: Implement in Lesson 4 — scan files for TODO/FIXME/HACK comments
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

export default todoTracker;
