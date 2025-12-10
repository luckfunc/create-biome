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
  console.log('🔧 package.json 已更新');
}

function ensureIgnoreFiles(projectDir: string) {
  const biomeIgnorePath = path.join(projectDir, '.biomeignore');
  const gitIgnorePath = path.join(projectDir, '.gitignore');

  if (!fs.existsSync(biomeIgnorePath)) {
    fs.writeFileSync(biomeIgnorePath, '# Created by create-biome\n');
    console.log(chalk.gray('📄 已创建 .biomeignore'));
  }

  if (!fs.existsSync(gitIgnorePath)) {
    fs.writeFileSync(gitIgnorePath, '# Created by create-biome\n.biomeignore\n');
    console.log(chalk.gray('📄 已创建 .gitignore'));
    return;
  }

  const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
  if (!gitIgnoreContent.includes('.biomeignore')) {
    fs.appendFileSync(gitIgnorePath, '\n# Create Biome\n.biomeignore\n');
    console.log(chalk.gray('📄 已向 .gitignore 添加 .biomeignore 记录'));
  }
}

function ensureEditorConfig(projectDir: string, template: TemplateDefinition) {
  const editorConfigFile = path.join(projectDir, '.editorconfig');
  const existed = fs.existsSync(editorConfigFile);
  const editorConfigContent = loadEditorConfigTemplate(template);
  fs.writeFileSync(editorConfigFile, editorConfigContent);
  if (existed) {
    console.log(chalk.yellow('⚠️ 已覆盖现有 .editorconfig'));
  } else {
    console.log(chalk.gray('📄 已创建 .editorconfig'));
  }
}

function createBiomeConfig(projectDir: string, template: TemplateDefinition) {
  const biomeJson = JSON.parse(fs.readFileSync(template.biomeTemplatePath, 'utf8'));
  const biomeJsonPath = path.join(projectDir, 'biome.json');
  if (fs.existsSync(biomeJsonPath)) {
    console.log('⚠️ biome.json 已存在，不覆盖');
    return;
  }
  fs.writeFileSync(biomeJsonPath, JSON.stringify(biomeJson, null, 2));
  console.log('✨ 已创建 biome.json');
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

export async function initBiome() {
  const projectDir = process.cwd();
  intro(chalk.cyan('🚀 create-biome 初始化'));

  const confirmInitDir = await confirm({ message: `在目录：${projectDir} 初始化？` });
  if (isCancel(confirmInitDir) || confirmInitDir === false) {
    cancel('👋 已取消');
    process.exit(0);
  }

  const pkgJsonPath = path.join(projectDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    cancel(`当前目录缺少 package.json`);
    process.exit(1);
  }

  const defaultTemplate = availableTemplates.find((template) => template.isDefault);
  if (!defaultTemplate) {
    cancel('当前缺少可用模板，请检查安装包。');
    process.exit(1);
  }

  const selectedTemplate = await select({
    message: '选择项目模板',
    options: availableTemplates.map((template) => ({ value: template.id, label: template.label })),
    initialValue: defaultTemplate.id,
  });

  if (isCancel(selectedTemplate)) {
    cancel('👋 已取消');
    process.exit(0);
  }

  if (typeof selectedTemplate !== 'string') {
    cancel('👋 已取消');
    process.exit(0);
  }

  const template = getTemplateById(selectedTemplate as TemplateId);

  ensureIgnoreFiles(projectDir);
  ensureEditorConfig(projectDir, template);

  const detectedPM = detectPackageManager(projectDir);
  const packageManager = await select({
    message: '选择包管理器',
    options: buildPackageManagerChoices(detectedPM),
    initialValue: detectedPM,
  });

  if (isCancel(packageManager)) {
    cancel('👋 已取消');
    process.exit(0);
  }

  createBiomeConfig(projectDir, template);
  applyTemplateToPackageJson(pkgJsonPath, template);

  cleanupTemplateMarkers(projectDir, [baseTemplateAssets.templateDir, template.templateDir]);

  await installDevPackages(packageManager, ['@biomejs/biome'], '@biomejs/biome');

  outro('🎉 create-biome 初始化完成');
}
