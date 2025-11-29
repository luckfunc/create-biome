import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export function cleanupTemplateMarkers(targetDir: string, templateDirs: string[]) {
  const deletedPaths = new Set<string>();
  const markerSuffix = '.delete';

  const walk = (dir: string, rootDir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, rootDir);
        continue;
      }

      if (!entry.name.endsWith(markerSuffix)) continue;

      const relativePath = path.relative(rootDir, fullPath);
      const targetRelativePath = relativePath.slice(0, -markerSuffix.length);
      const targetPath = path.normalize(path.join(targetDir, targetRelativePath));

      if (deletedPaths.has(targetPath)) continue;
      deletedPaths.add(targetPath);

      if (!fs.existsSync(targetPath)) continue;

      fs.rmSync(targetPath, { recursive: true, force: true });
      const logPath = path.relative(targetDir, targetPath) || targetPath;
      console.log(chalk.gray(`🧹 已删除 ${logPath}`));
    }
  };

  for (const templateDir of templateDirs) {
    if (!templateDir || !fs.existsSync(templateDir)) continue;
    walk(templateDir, templateDir);
  }
}
