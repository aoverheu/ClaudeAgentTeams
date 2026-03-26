import { Command } from 'commander';
import codeHealth from '../modules/code-health/index.js';
import { loadConfig } from '../shared/config.js';
import { formatOutput, formatError, resolveOutputMode, createChalk } from '../shared/formatter.js';

export function registerHealthCommand(program: Command): void {
  program
    .command('health')
    .description('Report code health metrics')
    .option('--max-file-size <n>', 'Lines threshold for large file warning', parseInt)
    .option('--max-complexity <n>', 'Cyclomatic complexity threshold', parseInt)
    .option('--check-coverage', 'Include test coverage gap analysis')
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();
      const config = await loadConfig(globalOpts.config);
      const outputMode = resolveOutputMode(globalOpts);
      const c = createChalk(outputMode);

      const mergedOptions = {
        targetPath: globalOpts.target,
        json: globalOpts.json,
        verbose: globalOpts.verbose,
        ...config.codeHealth,
        ...options,
      };

      const validationError = await codeHealth.validate(mergedOptions);
      if (validationError) {
        formatError(validationError, c);
        process.exit(1);
      }

      const result = await codeHealth.execute(mergedOptions);
      formatOutput(result, { outputMode, verbose: globalOpts.verbose, chalk: c });
    });
}
