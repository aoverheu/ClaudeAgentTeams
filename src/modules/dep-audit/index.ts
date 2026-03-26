import type { Module, DepAuditOptions, ModuleOutput, ModuleError } from '../../shared/types.js';

const depAudit: Module<DepAuditOptions> = {
  name: 'dep-audit',
  description: 'Audit package.json dependencies',

  async execute(options): Promise<ModuleOutput> {
    // TODO: Implement in Lesson 4 — check npm registry for outdated/deprecated deps
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
    // TODO: Implement in Lesson 4 — check targetPath exists, package.json present
    return null;
  },
};

export default depAudit;
