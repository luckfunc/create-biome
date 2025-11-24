#!/usr/bin/env node

import { intro, outro, select, confirm, isCancel, spinner, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const biomeConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'biome.template.json'), 'utf8'),
);

const editorConfigContent = fs.readFileSync(path.join(__dirname, 'editorconfig.template'), 'utf8');

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

async function runInteractiveInit() {
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

  // 2. 自动生成 ignore
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

  // 3. 写入 .editorconfig
  const editorConfigPath = path.join(cwd, '.editorconfig');
  if (!fs.existsSync(editorConfigPath)) {
    fs.writeFileSync(editorConfigPath, editorConfigContent);
    console.log(chalk.gray('📄 已创建 .editorconfig'));
  }

  // 4. 包管理器选择
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

  // 5. 写入 biome.json
  const biomePath = path.join(cwd, 'biome.json');
  if (!fs.existsSync(biomePath)) {
    fs.writeFileSync(biomePath, JSON.stringify(biomeConfig, null, 2));
    console.log('✨ 已创建 biome.json');
  } else {
    console.log('⚠️ biome.json 已存在，不覆盖');
  }

  // 6. 安装依赖
  const load = spinner();
  load.start(`安装 @biomejs/biome ...`);
  try {
    execSync(`${pm} add -D @biomejs/biome`, { stdio: 'ignore' });
    load.stop('📦 已安装 @biomejs/biome');
  } catch {
    load.stop('❌ 安装失败，请手动安装');
  }

  // 7. 安装 CLI 平台包
  let cliPkg: string | null = null;
  const os = process.platform;
  const arch = process.arch;

  if (os === 'darwin' && arch === 'arm64') cliPkg = '@biomejs/cli-darwin-arm64';
  else if (os === 'darwin' && arch === 'x64') cliPkg = '@biomejs/cli-darwin-x64';
  else if (os === 'linux' && arch === 'x64') cliPkg = '@biomejs/cli-linux-x64';

  if (cliPkg) {
    const load2 = spinner();
    load2.start(`安装 ${cliPkg} ...`);
    try {
      execSync(`${pm} add -D ${cliPkg}`, { stdio: 'ignore' });
      load2.stop(`📦 已安装 ${cliPkg}`);
    } catch {
      load2.stop('❌ 安装 CLI 失败，请手动安装');
    }
  }

  // 8. 注入 scripts
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts ||= {};
  pkg.scripts.lint ||= 'biome check .';
  pkg.scripts['lint:fix'] ||= 'biome format --write . && biome check --write .';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log('🔧 package.json scripts 已添加');

  outro('🎉 create-biome 初始化完成');
}

// Commander 用于支持非交互模式
const program = new Command();

program.name('create-biome').description('统一初始化 biome 配置');

program.command('init').description('交互式初始化').action(runInteractiveInit);

// 默认执行 init
program.action(runInteractiveInit);

program.parse(process.argv);
