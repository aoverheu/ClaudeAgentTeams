import { describe, it, expect } from 'vitest';
import todoTracker from '../../src/modules/todo-tracker/index.js';
import depAudit from '../../src/modules/dep-audit/index.js';
import gitStats from '../../src/modules/git-stats/index.js';
import codeHealth from '../../src/modules/code-health/index.js';

const stubOptions = { targetPath: '.', json: false, verbose: false };

describe('module stubs', () => {
  it('todo-tracker returns stub result', async () => {
    const result = await todoTracker.execute(stubOptions);
    expect(result.success).toBe(true);
    expect(result.moduleName).toBe('todo-tracker');
  });

  it('dep-audit returns stub result', async () => {
    const result = await depAudit.execute(stubOptions);
    expect(result.success).toBe(true);
    expect(result.moduleName).toBe('dep-audit');
  });

  it('git-stats returns stub result', async () => {
    const result = await gitStats.execute(stubOptions);
    expect(result.success).toBe(true);
    expect(result.moduleName).toBe('git-stats');
  });

  it('code-health returns stub result', async () => {
    const result = await codeHealth.execute(stubOptions);
    expect(result.success).toBe(true);
    expect(result.moduleName).toBe('code-health');
  });

  it('all modules validate without error', async () => {
    expect(await todoTracker.validate(stubOptions)).toBeNull();
    expect(await depAudit.validate(stubOptions)).toBeNull();
    expect(await gitStats.validate(stubOptions)).toBeNull();
    expect(await codeHealth.validate(stubOptions)).toBeNull();
  });
});
