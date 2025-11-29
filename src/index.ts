#!/usr/bin/env node

import { intro, outro, select, confirm, isCancel, spinner, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { availableTemplates, baseTemplateAssets, getTemplateById } from './templates.ts';
import type { TemplateDefinition, TemplateId } from './templates.ts';
import { removeDeleteMarkers } from './utils/deleteMarkers.ts';
import {
  applyPackageDeleteSpec,
  applyPackageMergeSpec,
  loadJsonIfExists,
  readPackageJson,
  writePackageJson,
} from './utils/packageJson.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function detectPackageManager(cwd: string) {
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';
  return 'npm';
}

function getPackageManagerOptions(autoPM: string) {
  const all = ['pnpm', 'npm', 'yarn', 'bun'];

  const sorted = [autoPM, ...all.filter((pm) => pm !== autoPM)];

  return sorted.map((pm) => ({
    value: pm,
    label: pm === autoPM ? chalk.green(`✔ ${pm}（自动识别，回车默认选择）`) : pm,
  }));
}

function getDevInstallCommand(pm: string, packages: string[]) {
  const pkgList = packages.join(' ');
  switch (pm) {
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

function installDevDependencies(pm: string, packages: string[], label: string) {
  const command = getDevInstallCommand(pm, packages);
  const load = spinner();
  load.start(`安装 ${label} ...`);
  try {
    execSync(command, { stdio: 'ignore' });
    load.stop(`📦 已安装 ${label}`);
  } catch {
    load.stop(`❌ 安装 ${label} 失败，请手动执行：${command}`);
  }
}

function updatePackageJsonWithTemplate(pkgPath: string, template: TemplateDefinition) {
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
  const cwd = process.cwd();
  intro(chalk.cyan('🚀 create-biome 初始化'));

  // 0. 确认目录
  const dirConfirm = await confirm({ message: `在目录：${cwd} 初始化？` });
  if (isCancel(dirConfirm) || dirConfirm === false) {
    cancel('👋 已取消');
    process.exit(0);
  }

  // 1. 检查 package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    cancel(`当前目录缺少 package.json`);
    process.exit(1);
  }

  const defaultTemplate = availableTemplates[0];
  if (!defaultTemplate) {
    cancel('当前缺少可用模板，请检查安装包。');
    process.exit(1);
  }

  // 2. 选择模板
  const templateAnswer = await select({
    message: '选择项目模板',
    options: availableTemplates.map((tpl) => ({ value: tpl.id, label: tpl.label })),
    initialValue: defaultTemplate.id,
  });

  if (isCancel(templateAnswer)) {
    cancel('👋 已取消');
    process.exit(0);
  }

  if (typeof templateAnswer !== 'string') {
    cancel('👋 已取消');
    process.exit(0);
  }

  const selectedTemplate = getTemplateById(templateAnswer as TemplateId);

  // 3. 自动生成 ignore
  const biomeIgnore = path.join(cwd, '.biomeignore');
  const gitIgnore = path.join(cwd, '.gitignore');

  if (!fs.existsSync(biomeIgnore)) {
    fs.writeFileSync(biomeIgnore, '# Created by create-biome\n');
    console.log(chalk.gray('📄 已创建 .biomeignore'));
  }

  if (!fs.existsSync(gitIgnore)) {
    fs.writeFileSync(gitIgnore, '# Created by create-biome\n.biomeignore\n');
    console.log(chalk.gray('📄 已创建 .gitignore'));
  } else {
    const gitIgnoreContent = fs.readFileSync(gitIgnore, 'utf8');
    if (!gitIgnoreContent.includes('.biomeignore')) {
      fs.appendFileSync(gitIgnore, '\n# Create Biome\n.biomeignore\n');
      console.log(chalk.gray('📄 已向 .gitignore 添加 .biomeignore 记录'));
    }
  }

  // 4. 写入 .editorconfig
  const editorConfigPath = path.join(cwd, '.editorconfig');
  if (!fs.existsSync(editorConfigPath)) {
    const editorConfigContent = readEditorConfigTemplate(selectedTemplate);
    fs.writeFileSync(editorConfigPath, editorConfigContent);
    console.log(chalk.gray('📄 已创建 .editorconfig'));
  }

  // 5. 包管理器选择
  const autoPM = detectPackageManager(cwd);

  const pm = await select({
    message: '选择包管理器',
    options: getPackageManagerOptions(autoPM),
    initialValue: autoPM,
  });

  if (isCancel(pm)) {
    cancel('👋 已取消');
    process.exit(0);
  }

  // 6. 写入 biome.json
  const biomeConfig = JSON.parse(fs.readFileSync(selectedTemplate.biomeTemplatePath, 'utf8'));
  const biomePath = path.join(cwd, 'biome.json');
  if (!fs.existsSync(biomePath)) {
    fs.writeFileSync(biomePath, JSON.stringify(biomeConfig, null, 2));
    console.log('✨ 已创建 biome.json');
  } else {
    console.log('⚠️ biome.json 已存在，不覆盖');
  }

  // 7. 同步 package.json
  // TODO 更新完成后增加loading依赖
  updatePackageJsonWithTemplate(pkgPath, selectedTemplate);

  // TODO 后续删除依赖的时候 也和161行保持一致 展示删除的文件
  removeDeleteMarkers(cwd, [baseTemplateAssets.templateDir, selectedTemplate.templateDir]);

  // 8. 安装依赖
  installDevDependencies(pm, ['@biomejs/biome'], '@biomejs/biome');

  outro('🎉 create-biome 初始化完成');
}

function readEditorConfigTemplate(template: TemplateDefinition) {
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
