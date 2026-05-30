import { cancel, confirm, intro, isCancel, outro, select } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { availableTemplates, baseTemplateAssets, getTemplateById } from '../template/index.ts';
import type { InitBiomeOptions, PackageManager, TemplateDefinition, TemplateId } from '../types.ts';
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

function canPrompt() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function ensureNonInteractiveRunHasConsent(options: InitBiomeOptions) {
  if (options.yes || canPrompt()) {
    return;
  }

  throw new Error(
    'Interactive prompts are not available in this environment. Re-run with --yes to accept defaults, or combine --yes with --template and --package-manager for explicit setup.',
  );
}

function getDefaultTemplate() {
  const defaultTemplate = availableTemplates.find((template) => template.isDefault);
  if (!defaultTemplate) {
    cancel('No templates are available. Please check the package contents.');
    process.exit(1);
  }
  return defaultTemplate;
}

async function confirmProjectDirectory(projectDir: string, options: InitBiomeOptions) {
  if (options.yes) {
    return;
  }

  const confirmInitDir = await confirm({ message: `Initialize in this directory: ${projectDir}?` });
  if (isCancel(confirmInitDir) || confirmInitDir === false) {
    cancel('👋 Cancelled');
    process.exit(0);
  }
}

async function resolveTemplate(options: InitBiomeOptions): Promise<TemplateDefinition> {
  if (options.template) {
    return getTemplateById(options.template);
  }

  const defaultTemplate = getDefaultTemplate();
  if (options.yes) {
    return defaultTemplate;
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

  return getTemplateById(selectedTemplate as TemplateId);
}

async function resolvePackageManager(
  projectDir: string,
  options: InitBiomeOptions,
): Promise<PackageManager> {
  if (options.packageManager) {
    return options.packageManager;
  }

  const detectedPM = detectPackageManager(projectDir);
  if (options.yes) {
    return detectedPM;
  }

  const packageManager = await select({
    message: 'Choose a package manager',
    options: buildPackageManagerChoices(detectedPM),
    initialValue: detectedPM,
  });

  if (isCancel(packageManager)) {
    cancel('👋 Cancelled');
    process.exit(0);
  }

  if (typeof packageManager !== 'string') {
    cancel('👋 Cancelled');
    process.exit(0);
  }

  return packageManager as PackageManager;
}

export async function initBiome(options: InitBiomeOptions = {}) {
  const projectDir = process.cwd();
  intro(chalk.cyan('🚀 create-biome setup'));

  ensureNonInteractiveRunHasConsent(options);
  await confirmProjectDirectory(projectDir, options);

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    cancel('package.json is missing in the current directory');
    process.exit(1);
  }

  const template = await resolveTemplate(options);

  ensureIgnoreFiles(projectDir);
  ensureEditorConfig(projectDir, template);

  const packageManager = await resolvePackageManager(projectDir, options);

  createBiomeConfig(projectDir, template);
  applyTemplateToPackageJson(pkgJsonPath, template);

  cleanupTemplateMarkers(projectDir, [baseTemplateAssets.templateDir, template.templateDir]);

  if (options.install === false) {
    console.log(chalk.yellow('⚠️ Skipped installing @biomejs/biome'));
  } else {
    await installDevPackages(packageManager, ['@biomejs/biome'], '@biomejs/biome');
  }

  outro('🎉 create-biome setup complete');
}
