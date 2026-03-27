import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { generateReport } from '../modules/report/index.js';

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description('Generate a unified DevKit report from all modules')
    .option('-o, --output <file>', 'Output file path', 'devkit-report.md')
    .option('--stdout', 'Print report to stdout instead of writing to file')
    .action(async (options, command) => {
      const globalOpts = command.optsWithGlobals();

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
    });
}
