import { Command } from 'commander';
import depAudit from '../modules/dep-audit/index.js';
import { loadConfig } from '../shared/config.js';
import { formatOutput, formatError, resolveOutputMode, createChalk } from '../shared/formatter.js';

export function registerDepsCommand(program: Command): void {
  program
    .command('deps')
    .description('Audit package.json dependencies')
    .option('--prod-only', 'Check only production dependencies')
    .option('--dev-only', 'Check only dev dependencies')
    .option('--severity <level>', 'Minimum severity: low, moderate, high, critical')
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();
      const config = await loadConfig(globalOpts.config);
      const outputMode = resolveOutputMode(globalOpts);
      const c = createChalk(outputMode);

      const mergedOptions = {
        targetPath: globalOpts.target,
        json: globalOpts.json,
        verbose: globalOpts.verbose,
        ...config.depAudit,
        ...options,
      };

      const validationError = await depAudit.validate(mergedOptions);
      if (validationError) {
        formatError(validationError, c);
        process.exit(1);
      }

      const result = await depAudit.execute(mergedOptions);
      formatOutput(result, { outputMode, verbose: globalOpts.verbose, chalk: c });
    });
}
