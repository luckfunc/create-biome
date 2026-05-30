#!/usr/bin/env node

import chalk from 'chalk';
import { Command, Option } from 'commander';
import { initBiome } from './commands/init.ts';

const program = new Command();

program.name('create-biome').description('Initialize Biome configuration for the current project');
addInitOptions(program);
program.addHelpText(
  'after',
  `
Examples:
  $ npx create-biome
  $ npx create-biome init
  $ npx create-biome --yes
  $ npx create-biome --yes --template react --package-manager npm
`,
);

const initCommand = program
  .command('init')
  .description('Run interactive setup')
  .addHelpText(
    'after',
    `
Examples:
  $ npx create-biome init
  $ npx create-biome init --yes
  $ npx create-biome init --yes --template javascript --package-manager pnpm
`,
  );
addInitOptions(initCommand);

initCommand.action((_options, command: Command) => initBiome(command.optsWithGlobals()));

program.action(() => initBiome(program.opts()));

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  console.error(chalk.red(`✖ ${message}`));
  process.exit(1);
});

function addInitOptions(command: Command) {
  command
    .option('-y, --yes', 'Accept defaults and skip interactive prompts')
    .addOption(
      new Option('-t, --template <template>', 'Project template to apply').choices([
        'react',
        'javascript',
      ]),
    )
    .addOption(
      new Option('-p, --package-manager <package-manager>', 'Package manager to use').choices([
        'pnpm',
        'npm',
        'yarn',
        'bun',
      ]),
    )
    .option('--no-install', 'Skip installing @biomejs/biome');
}
