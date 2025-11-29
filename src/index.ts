#!/usr/bin/env node

import { intro, outro, select, confirm, isCancel, spinner, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { availableTemplates, baseTemplateAssets, getTemplateById } from './templates.ts';
import type { TemplateDefinition, TemplateId } from './templates.ts';
import { cleanupTemplateMarkers } from './utils/deleteMarkers.ts';
import {
  applyPackageDeleteSpec,
  applyPackageMergeSpec,
  loadJsonIfExists,
  readPackageJson,
  writePackageJson,
} from './utils/packageJson.ts';

const runCommandAsync = promisify(exec);

function detectPackageManagerFromDir(projectDir: string) {
  if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(projectDir, 'bun.lockb'))) {
    return 'bun';
  }
  if (fs.existsSync(path.join(projectDir, 'package-lock.json'))) {
    return 'npm';
  }
  return 'npm';
}

function buildPackageManagerChoices(detectedPM: string) {
  const allManagers = ['pnpm', 'npm', 'yarn', 'bun'];

  const sortedManagers = [detectedPM, ...allManagers.filter((pm) => pm !== detectedPM)];

  return sortedManagers.map((pm) => ({
    value: pm,
    label: pm === detectedPM ? chalk.green(`✔ ${pm}（自动识别，回车默认选择）`) : pm,
  }));
}

function buildDevInstallCommand(packageManager: string, packages: string[]) {
  const pkgList = packages.join(' ');
  switch (packageManager) {
    case 'npm':
      return `npm install --save-dev ${pkgList}`;
    case 'yarn':
      return `yarn add --dev ${pkgList}`;
    case 'bun':
      return `bun add --dev ${pkgList}`;
    default:
      return `pnpm add -D ${pkgList}`;
  }
}

async function installDevPackages(packageManager: string, packages: string[], label: string) {
  const command = buildDevInstallCommand(packageManager, packages);
  const load = spinner();

  load.start(`安装 ${label} ...`);
  try {
    await runCommandAsync(command);
    load.stop(`📦 已安装 ${label}`);
  } catch {
    load.stop(`❌ 安装 ${label} 失败，请手动执行：${command}`);
  }
}

function applyTemplateToPackageJson(pkgPath: string, template: TemplateDefinition) {
  const pkg = readPackageJson(pkgPath);

  const deleteSpecs = [
    loadJsonIfExists(baseTemplateAssets.packageDeletePath),
    loadJsonIfExists(template.packageDeletePath),
  ];

  for (const spec of deleteSpecs) {
    if (spec) applyPackageDeleteSpec(pkg, spec);
  }

  const mergeSpecs = [
    loadJsonIfExists(baseTemplateAssets.packageMergePath),
    loadJsonIfExists(template.packageMergePath),
  ];

  for (const spec of mergeSpecs) {
    if (spec) applyPackageMergeSpec(pkg, spec);
  }

  writePackageJson(pkgPath, pkg);
  console.log('🔧 package.json 已更新');
}

async function initBiome() {
  const projectDir = process.cwd();
  intro(chalk.cyan('🚀 create-biome 初始化'));

  // 1. 确认目录
  const confirmInitDir = await confirm({ message: `在目录：${projectDir} 初始化？` });
  if (isCancel(confirmInitDir) || confirmInitDir === false) {
    cancel('👋 已取消');
    process.exit(0);
  }

  // 2. package.json
  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    cancel(`当前目录缺少 package.json`);
    process.exit(1);
  }

  const fallbackTemplate = availableTemplates[0];
  if (!fallbackTemplate) {
    cancel('当前缺少可用模板，请检查安装包。');
    process.exit(1);
  }

  // 3. 选择模板
  const selectedTemplateId = await select({
    message: '选择项目模板',
    options: availableTemplates.map((tpl) => ({ value: tpl.id, label: tpl.label })),
    initialValue: fallbackTemplate.id,
  });

  if (isCancel(selectedTemplateId)) {
    cancel('👋 已取消');
    process.exit(0);
  }

  if (typeof selectedTemplateId !== 'string') {
    cancel('👋 已取消');
    process.exit(0);
  }

  const template = getTemplateById(selectedTemplateId as TemplateId);

  // 4. 创建ignore 文件
  const biomeIgnorePath = path.join(projectDir, '.biomeignore');
  const gitIgnorePath = path.join(projectDir, '.gitignore');

  if (!fs.existsSync(biomeIgnorePath)) {
    fs.writeFileSync(biomeIgnorePath, '# Created by create-biome\n');
    console.log(chalk.gray('📄 已创建 .biomeignore'));
  }

  if (!fs.existsSync(gitIgnorePath)) {
    fs.writeFileSync(gitIgnorePath, '# Created by create-biome\n.biomeignore\n');
    console.log(chalk.gray('📄 已创建 .gitignore'));
  } else {
    const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
    if (!gitIgnoreContent.includes('.biomeignore')) {
      fs.appendFileSync(gitIgnorePath, '\n# Create Biome\n.biomeignore\n');
      console.log(chalk.gray('📄 已向 .gitignore 添加 .biomeignore 记录'));
    }
  }

  // 5. 覆盖editorconfig
  const editorConfigFile = path.join(projectDir, '.editorconfig');
  if (!fs.existsSync(editorConfigFile)) {
    const editorConfigContent = loadEditorConfigTemplate(template);
    fs.writeFileSync(editorConfigFile, editorConfigContent);
    console.log(chalk.gray('📄 已创建 .editorconfig'));
  }

  // 6. 选择包管理器
  const detectedPM = detectPackageManagerFromDir(projectDir);

  const packageManager = await select({
    message: '选择包管理器',
    options: buildPackageManagerChoices(detectedPM),
    initialValue: detectedPM,
  });

  if (isCancel(packageManager)) {
    cancel('👋 已取消');
    process.exit(0);
  }

  // 7. 创建biome.json
  const biomeJson = JSON.parse(fs.readFileSync(template.biomeTemplatePath, 'utf8'));
  const biomeJsonPath = path.join(projectDir, 'biome.json');
  if (!fs.existsSync(biomeJsonPath)) {
    fs.writeFileSync(biomeJsonPath, JSON.stringify(biomeJson, null, 2));
    console.log('✨ 已创建 biome.json');
  } else {
    console.log('⚠️ biome.json 已存在，不覆盖');
  }

  // 8. 同步 package.json
  applyTemplateToPackageJson(pkgJsonPath, template);

  // 清理模板标记
  cleanupTemplateMarkers(projectDir, [baseTemplateAssets.templateDir, template.templateDir]);

  // 8. 开始安装依赖
  await installDevPackages(packageManager, ['@biomejs/biome'], '@biomejs/biome');

  outro('🎉 create-biome 初始化完成');
}

function loadEditorConfigTemplate(template: TemplateDefinition) {
  const templatePaths = [template.editorConfigPath, baseTemplateAssets.editorConfigPath];

  for (const filePath of templatePaths) {
    if (!filePath) continue;
    if (!fs.existsSync(filePath)) continue;
    return fs.readFileSync(filePath, 'utf8');
  }

  throw new Error('缺少 editorconfig 模板，请检查安装包。');
}

// Commander 用于支持非交互模式
const program = new Command();

program.name('create-biome').description('统一初始化 biome 配置');

program.command('init').description('交互式初始化').action(initBiome);

// 默认执行 init
program.action(initBiome);

program.parse(process.argv);
