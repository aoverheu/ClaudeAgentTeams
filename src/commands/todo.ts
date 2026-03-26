import { Command } from 'commander';
import todoTracker from '../modules/todo-tracker/index.js';
import { loadConfig } from '../shared/config.js';
import { formatOutput, formatError, resolveOutputMode, createChalk } from '../shared/formatter.js';

export function registerTodoCommand(program: Command): void {
  program
    .command('todo')
    .description('Scan codebase for TODO/FIXME/HACK comments')
    .option('-a, --author <name>', 'Filter by author')
    .option('--tag <type>', 'Filter by tag: TODO, FIXME, HACK', 'all')
    .option('--older-than <days>', 'Filter TODOs older than N days', parseInt)
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();
      const config = await loadConfig(globalOpts.config);
      const outputMode = resolveOutputMode(globalOpts);
      const c = createChalk(outputMode);

      const mergedOptions = {
        targetPath: globalOpts.target,
        json: globalOpts.json,
        verbose: globalOpts.verbose,
        ...config.todo,
        ...options,
      };

      const validationError = await todoTracker.validate(mergedOptions);
      if (validationError) {
        formatError(validationError, c);
        process.exit(1);
      }

      const result = await todoTracker.execute(mergedOptions);
      formatOutput(result, { outputMode, verbose: globalOpts.verbose, chalk: c });
    });
}
