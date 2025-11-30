import { spawn } from 'child_process';

export function runCommandWithStream(command: string, args: string[]) {
  const isWindows = process.platform === 'win32';
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const fullCommand = [command, ...args].join(' ');
      reject(new Error(`Command failed: ${fullCommand}`));
    });
  });
}
