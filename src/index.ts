#!/usr/bin/env node
import { Command } from 'commander';
import { registerTodoCommand } from './commands/todo.js';
import { registerDepsCommand } from './commands/deps.js';
import { registerGitStatsCommand } from './commands/git-stats.js';
import { registerHealthCommand } from './commands/health.js';

const program = new Command();

program
  .name('devkit')
  .description('Developer Toolkit CLI')
  .version('0.1.0');

// Global options — inherited by all subcommands via optsWithGlobals()
program
  .option('--json', 'Output results as JSON', false)
  .option('--verbose', 'Show detailed output', false)
  .option('--no-color', 'Disable colored output')
  .option('--config <path>', 'Path to config file', '.devkitrc.json')
  .option('-t, --target <path>', 'Target directory to analyze', process.cwd());

registerTodoCommand(program);
registerDepsCommand(program);
registerGitStatsCommand(program);
registerHealthCommand(program);

program.parse();
