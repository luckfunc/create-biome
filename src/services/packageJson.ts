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

export function applyPackageDeleteSpec(target: JsonObject, spec: JsonObject): string[] {
  return applyDeleteRecursively(target, spec, []);
}

export function applyPackageMergeSpec(target: JsonObject, spec: JsonObject) {
  applyMergeRecursively(target, spec);
}

function applyDeleteRecursively(
  target: JsonObject,
  spec: JsonObject,
  segments: string[],
): string[] {
  const removedPaths: string[] = [];

  for (const [key, value] of Object.entries(spec)) {
    const pathSegments = [...segments, key];
    const currentPath = formatJsonPath(pathSegments);
    if (value === null) {
      if (Object.hasOwn(target, key)) {
        delete target[key];
        removedPaths.push(currentPath);
      }
      continue;
    }

    if (isPlainObject(value) && isPlainObject(target[key])) {
      const nestedRemoved = applyDeleteRecursively(target[key] as JsonObject, value, pathSegments);
      removedPaths.push(...nestedRemoved);
      const targetHasKey = Object.hasOwn(target, key);
      if (targetHasKey && isEmptyObject(target[key] as JsonObject)) {
        delete target[key];
        removedPaths.push(currentPath);
      }
    }
  }

  return removedPaths;
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

function formatJsonPath(segments: string[]) {
  const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  return segments
    .map((segment, index) => {
      const isIdentifier = identifierPattern.test(segment);
      if (index === 0) {
        return isIdentifier ? segment : `[${JSON.stringify(segment)}]`;
      }

      return isIdentifier ? `.${segment}` : `[${JSON.stringify(segment)}]`;
    })
    .join('');
}
