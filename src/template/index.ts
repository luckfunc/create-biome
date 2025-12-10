import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TemplateDefinition, TemplateId } from '../types.ts';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const templateRoot = fs.existsSync(path.join(moduleDir, 'base'))
  ? moduleDir
  : path.join(moduleDir, 'template');

export const baseTemplateAssets = {
  templateDir: path.join(templateRoot, 'base'),
  packageMergePath: path.join(templateRoot, 'base', 'package.merge.json'),
  editorConfigPath: path.join(templateRoot, 'base', 'editorconfig.template'),
};

function resolvePathSafe(filePath: string) {
  return fs.existsSync(filePath) ? filePath : undefined;
}

export const availableTemplates: TemplateDefinition[] = [
  {
    id: 'react',
    label: 'React / JSX 项目',
    isDefault: true,
    biomeTemplatePath: path.join(templateRoot, 'react', 'biome.template.json'),
    templateDir: path.join(templateRoot, 'react'),
    packageMergePath: resolvePathSafe(path.join(templateRoot, 'react', 'package.merge.json')),
    editorConfigPath: resolvePathSafe(path.join(templateRoot, 'react', 'editorconfig.template')),
  },
  {
    id: 'javascript',
    label: 'JavaScript / Node.js 项目',
    isDefault: false,
    biomeTemplatePath: path.join(templateRoot, 'javascript', 'biome.template.json'),
    templateDir: path.join(templateRoot, 'javascript'),
    packageMergePath: resolvePathSafe(path.join(templateRoot, 'javascript', 'package.merge.json')),
    editorConfigPath: resolvePathSafe(
      path.join(templateRoot, 'javascript', 'editorconfig.template'),
    ),
  },
];

export function getTemplateById(id: TemplateId): TemplateDefinition {
  const template = availableTemplates.find((template) => template.id === id);
  if (!template) {
    throw new Error(`Unknown template: ${id}`);
  }
  return template;
}
