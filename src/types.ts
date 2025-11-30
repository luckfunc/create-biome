export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun';

export type TemplateId = 'react' | 'javascript';

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  biomeTemplatePath: string;
  isDefault: boolean;
  templateDir: string;
  packageMergePath?: string;
  packageDeletePath?: string;
  editorConfigPath?: string;
}
