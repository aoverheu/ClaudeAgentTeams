import { Command } from 'commander';
import gitStats from '../modules/git-stats/index.js';
import { loadConfig } from '../shared/config.js';
import { formatOutput, formatError, resolveOutputMode, createChalk } from '../shared/formatter.js';

export function registerGitStatsCommand(program: Command): void {
  program
    .command('git-stats')
    .description('Show git commit statistics')
    .option('--since <date>', 'Start date for analysis')
    .option('--until <date>', 'End date for analysis')
    .option('--author <name>', 'Filter by author')
    .option('--top-n <count>', 'Number of top contributors', parseInt)
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();
      const config = await loadConfig(globalOpts.config);
      const outputMode = resolveOutputMode(globalOpts);
      const c = createChalk(outputMode);

      const mergedOptions = {
        targetPath: globalOpts.target,
        json: globalOpts.json,
        verbose: globalOpts.verbose,
        ...config.gitStats,
        ...options,
      };

      const validationError = await gitStats.validate(mergedOptions);
      if (validationError) {
        formatError(validationError, c);
        process.exit(1);
      }

      const result = await gitStats.execute(mergedOptions);
      formatOutput(result, { outputMode, verbose: globalOpts.verbose, chalk: c });
    });
}
