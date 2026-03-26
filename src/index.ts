#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { initBiome } from './commands/init.ts';

const program = new Command();

program.name('create-biome').description('Initialize Biome configuration for the current project');
program.addHelpText(
  'after',
  `
Examples:
  $ npx create-biome
  $ npx create-biome init
`,
);

program.command('init').description('Run interactive setup').action(initBiome);

program.action(initBiome);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  console.error(chalk.red(`✖ ${message}`));
  process.exit(1);
});
