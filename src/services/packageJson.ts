import fs from 'fs';

export type JsonObject = Record<string, unknown>;

export type PackageJson = JsonObject & {
  scripts?: Record<string, string>;
};

export function readPackageJson(pkgPath: string): PackageJson {
  const raw = fs.readFileSync(pkgPath, 'utf8');
  return JSON.parse(raw);
}

export function writePackageJson(pkgPath: string, pkg: PackageJson) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

export function loadJsonIfExists(filePath?: string): JsonObject | null {
  if (!filePath) {
    return null;
  }
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

export function applyPackageMergeSpec(target: JsonObject, spec: JsonObject) {
  applyMergeRecursively(target, spec);
}

function applyMergeRecursively(target: JsonObject, spec: JsonObject) {
  for (const [key, value] of Object.entries(spec)) {
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) {
        target[key] = {};
      }
      applyMergeRecursively(target[key] as JsonObject, value);
      continue;
    }

    target[key] = value;
  }
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
