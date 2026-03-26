import { cancel, confirm, intro, isCancel, outro, select } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { availableTemplates, baseTemplateAssets, getTemplateById } from '../template/index.ts';
import type { TemplateDefinition, TemplateId } from '../types.ts';
import { cleanupTemplateMarkers } from '../services/templateCleanup.ts';
import {
  applyPackageMergeSpec,
  loadJsonIfExists,
  readJsonFile,
  readPackageJson,
  writePackageJson,
} from '../services/packageJson.ts';
import {
  buildPackageManagerChoices,
  detectPackageManager,
  installDevPackages,
} from '../services/packageManager.ts';

function applyTemplateToPackageJson(pkgPath: string, template: TemplateDefinition) {
  const pkg = readPackageJson(pkgPath);

  const mergeSpecs = [
    loadJsonIfExists(baseTemplateAssets.packageMergePath),
    loadJsonIfExists(template.packageMergePath),
  ];

  for (const spec of mergeSpecs) {
    if (spec) {
      applyPackageMergeSpec(pkg, spec);
    }
  }

  writePackageJson(pkgPath, pkg);
  console.log('🔧 Updated package.json');
}

function ensureIgnoreFiles(projectDir: string) {
  const biomeIgnorePath = path.join(projectDir, '.biomeignore');
  const gitIgnorePath = path.join(projectDir, '.gitignore');

  if (!fs.existsSync(biomeIgnorePath)) {
    fs.writeFileSync(biomeIgnorePath, '# Created by create-biome\n');
    console.log(chalk.gray('📄 Created .biomeignore'));
  }

  if (!fs.existsSync(gitIgnorePath)) {
    fs.writeFileSync(gitIgnorePath, '# Created by create-biome\n.biomeignore\n');
    console.log(chalk.gray('📄 Created .gitignore'));
    return;
  }

  const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
  if (!gitIgnoreContent.includes('.biomeignore')) {
    fs.appendFileSync(gitIgnorePath, '\n# Create Biome\n.biomeignore\n');
    console.log(chalk.gray('📄 Added .biomeignore to .gitignore'));
  }
}

function ensureEditorConfig(projectDir: string, template: TemplateDefinition) {
  const editorConfigFile = path.join(projectDir, '.editorconfig');
  if (fs.existsSync(editorConfigFile)) {
    console.log(chalk.yellow('⚠️ .editorconfig already exists, keeping the current file'));
    return;
  }

  const editorConfigContent = loadEditorConfigTemplate(template);
  fs.writeFileSync(editorConfigFile, editorConfigContent);
  console.log(chalk.gray('📄 Created .editorconfig'));
}

function createBiomeConfig(projectDir: string, template: TemplateDefinition) {
  const biomeJsonPath = path.join(projectDir, 'biome.json');
  if (fs.existsSync(biomeJsonPath)) {
    console.log('⚠️ biome.json already exists, skipping');
    return;
  }
  const biomeJson = readJsonFile<Record<string, unknown>>(template.biomeTemplatePath);
  fs.writeFileSync(biomeJsonPath, JSON.stringify(biomeJson, null, 2));
  console.log('✨ Created biome.json');
}

function loadEditorConfigTemplate(template: TemplateDefinition) {
  const templatePaths = [template.editorConfigPath, baseTemplateAssets.editorConfigPath];

  for (const filePath of templatePaths) {
    if (!filePath) continue;
    if (!fs.existsSync(filePath)) continue;
    return fs.readFileSync(filePath, 'utf8');
  }

  throw new Error('Missing editorconfig template. Please check the package contents.');
}

export async function initBiome() {
  const projectDir = process.cwd();
  intro(chalk.cyan('🚀 create-biome setup'));

  const confirmInitDir = await confirm({ message: `Initialize in this directory: ${projectDir}?` });
  if (isCancel(confirmInitDir) || confirmInitDir === false) {
    cancel('👋 Cancelled');
    process.exit(0);
  }

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    cancel('package.json is missing in the current directory');
    process.exit(1);
  }

  const defaultTemplate = availableTemplates.find((template) => template.isDefault);
  if (!defaultTemplate) {
    cancel('No templates are available. Please check the package contents.');
    process.exit(1);
  }

  const selectedTemplate = await select({
    message: 'Choose a project template',
    options: availableTemplates.map((template) => ({ value: template.id, label: template.label })),
    initialValue: defaultTemplate.id,
  });

  if (isCancel(selectedTemplate)) {
    cancel('👋 Cancelled');
    process.exit(0);
  }

  if (typeof selectedTemplate !== 'string') {
    cancel('👋 Cancelled');
    process.exit(0);
  }

  const template = getTemplateById(selectedTemplate as TemplateId);

  ensureIgnoreFiles(projectDir);
  ensureEditorConfig(projectDir, template);

  const detectedPM = detectPackageManager(projectDir);
  const packageManager = await select({
    message: 'Choose a package manager',
    options: buildPackageManagerChoices(detectedPM),
    initialValue: detectedPM,
  });

  if (isCancel(packageManager)) {
    cancel('👋 Cancelled');
    process.exit(0);
  }

  createBiomeConfig(projectDir, template);
  applyTemplateToPackageJson(pkgJsonPath, template);

  cleanupTemplateMarkers(projectDir, [baseTemplateAssets.templateDir, template.templateDir]);

  await installDevPackages(packageManager, ['@biomejs/biome'], '@biomejs/biome');

  outro('🎉 create-biome setup complete');
}
