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
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

export function applyPackageDeleteSpec(target: JsonObject, spec: JsonObject) {
  applyDeleteRecursively(target, spec);
}

export function applyPackageMergeSpec(target: JsonObject, spec: JsonObject) {
  applyMergeRecursively(target, spec);
}

function applyDeleteRecursively(target: JsonObject, spec: JsonObject) {
  for (const [key, value] of Object.entries(spec)) {
    if (value === null) {
      delete target[key];
      continue;
    }

    if (isPlainObject(value) && isPlainObject(target[key])) {
      applyDeleteRecursively(target[key] as JsonObject, value);
      if (isEmptyObject(target[key] as JsonObject)) {
        delete target[key];
      }
    }
  }
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

function isEmptyObject(value: JsonObject) {
  return Object.keys(value).length === 0;
}
