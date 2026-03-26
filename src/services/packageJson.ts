import fs from 'fs';

export type JsonObject = Record<string, unknown>;

export type PackageJson = JsonObject & {
  scripts?: Record<string, string>;
};

export function readJsonFile<T>(filePath: string): T {
  let raw: string;

  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file: ${filePath}`, {
      cause: error instanceof Error ? error : undefined,
    });
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? `：${error.message}` : '';
    throw new Error(`Failed to parse JSON file: ${filePath}${message}`, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}

export function readPackageJson(pkgPath: string): PackageJson {
  return readJsonFile<PackageJson>(pkgPath);
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
  return readJsonFile<JsonObject>(filePath);
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
