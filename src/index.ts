#!/usr/bin/env node

import { Command } from 'commander';
import { initBiome } from './commands/init.ts';

const program = new Command();

program.name('create-biome').description('统一初始化 biome 配置');

program.command('init').description('交互式初始化').action(initBiome);

program.action(initBiome);

program.parse(process.argv);
