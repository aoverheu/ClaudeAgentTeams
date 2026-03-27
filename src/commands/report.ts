import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { generateReport } from '../modules/report/index.js';
import { loadConfig } from '../shared/config.js';
import { formatError, resolveOutputMode, createChalk } from '../shared/formatter.js';

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description('Generate a unified DevKit report from all modules')
    .option('-o, --output <file>', 'Output file path (default: devkit-report.md)', 'devkit-report.md')
    .option('--stdout', 'Print report to stdout instead of writing to file')
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();
      const config = await loadConfig(globalOpts.config);
      const outputMode = resolveOutputMode(globalOpts);
      const c = createChalk(outputMode);

      try {
        const result = await generateReport({
          targetPath: globalOpts.target,
          verbose: globalOpts.verbose,
        });

        if (globalOpts.json) {
          const jsonOutput = JSON.stringify({
            generatedAt: result.generatedAt,
            sections: result.sections,
          }, null, 2);

          if (options.stdout) {
            console.log(jsonOutput);
          } else {
            const jsonPath = options.output.replace(/\.md$/, '.json');
            await writeFile(jsonPath, jsonOutput, 'utf-8');
            console.log(`Report written to ${jsonPath}`);
          }
          return;
        }

        if (options.stdout) {
          console.log(result.markdown);
        } else {
          await writeFile(options.output, result.markdown, 'utf-8');
          console.log(`Report written to ${options.output}`);
        }
      } catch (err) {
        formatError({
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : String(err),
          suggestion: 'Check that the target directory exists and is accessible.',
        }, c);
        process.exit(1);
      }
    });
}
