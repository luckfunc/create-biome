import { spinner } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { PackageManager } from '../types.ts';
import { runCommandWithStream } from './shell.ts';

const allPackageManagers: PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

export function detectPackageManager(projectDir: string): PackageManager {
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

export function buildPackageManagerChoices(detectedPM: PackageManager) {
  const sortedManagers: PackageManager[] = [
    detectedPM,
    ...allPackageManagers.filter((pm) => pm !== detectedPM),
  ];

  return sortedManagers.map((pm) => ({
    value: pm,
    label: pm === detectedPM ? chalk.green(`✔ ${pm}（自动识别，回车默认选择）`) : pm,
  }));
}

function buildDevInstallCommand(packageManager: PackageManager, packages: string[]) {
  switch (packageManager) {
    case 'npm':
      return { command: 'npm', args: ['install', '--save-dev', ...packages] };
    case 'yarn':
      return { command: 'yarn', args: ['add', '--dev', ...packages] };
    case 'bun':
      return { command: 'bun', args: ['add', '--dev', ...packages] };
    default:
      return { command: 'pnpm', args: ['add', '-D', ...packages] };
  }
}

export async function installDevPackages(
  packageManager: PackageManager,
  packages: string[],
  label: string,
) {
  const { command, args } = buildDevInstallCommand(packageManager, packages);
  const load = spinner();

  load.start(`安装 ${label} ...`);
  try {
    await runCommandWithStream(command, args);
    load.stop(`📦 已安装 ${label}`);
  } catch {
    const commandText = [command, ...args].join(' ');
    load.stop(`❌ 安装 ${label} 失败，请手动执行：${commandText}`);
  }
}
