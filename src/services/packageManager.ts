import { spinner } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { PackageManager } from '../types.ts';
import { runCommandWithStream } from './shell.ts';

const allPackageManagers: PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];
const packageManagerLockfiles: Record<PackageManager, string[]> = {
  bun: ['bun.lock', 'bun.lockb'],
  pnpm: ['pnpm-lock.yaml'],
  yarn: ['yarn.lock'],
  npm: ['package-lock.json'],
};
const packageManagerDetectionOrder: PackageManager[] = ['bun', 'pnpm', 'yarn', 'npm'];

export function detectPackageManager(projectDir: string): PackageManager {
  for (const packageManager of packageManagerDetectionOrder) {
    const hasLockfile = packageManagerLockfiles[packageManager].some((lockfile) =>
      fs.existsSync(path.join(projectDir, lockfile)),
    );

    if (hasLockfile) {
      return packageManager;
    }
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
    label: pm === detectedPM ? chalk.green(`✔ ${pm} (auto-detected, press Enter to use)`) : pm,
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

  load.start(`Installing ${label}...`);
  try {
    await runCommandWithStream(command, args);
    load.stop(`📦 Installed ${label}`);
  } catch (error) {
    const commandText = [command, ...args].join(' ');
    load.stop(chalk.red(`❌ Failed to install ${label}`));
    throw new Error(`Failed to install ${label}. Please run this manually: ${commandText}`, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}
