import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  Module,
  DepAuditOptions,
  ModuleOutput,
  ModuleError,
  ModuleResult,
  ResultItem,
  Severity,
  ResultWarning,
} from '../../shared/types.js';
import { ModuleErrorCode } from '../../shared/types.js';

/** Map DepAuditOptions severity to our internal Severity type */
const SEVERITY_ORDER: readonly Severity[] = ['info', 'warning', 'error', 'critical'] as const;

function severityThresholdIndex(threshold?: string): number {
  const map: Record<string, number> = {
    low: 0,       // info and above
    moderate: 1,  // warning and above
    high: 2,      // error and above
    critical: 3,  // critical only
  };
  return threshold ? (map[threshold] ?? 0) : 0;
}

function meetsThreshold(severity: Severity, threshold?: string): boolean {
  return SEVERITY_ORDER.indexOf(severity) >= severityThresholdIndex(threshold);
}

interface VersionParts {
  major: number;
  minor: number;
  patch: number;
}

function parseVersion(version: string): VersionParts | null {
  // Strip leading ^, ~, >=, etc.
  const cleaned = version.replace(/^[^0-9]*/, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function classifyVersionGap(current: VersionParts, latest: VersionParts): Severity {
  if (latest.major > current.major) return 'error';
  if (latest.minor > current.minor) return 'warning';
  if (latest.patch > current.patch) return 'info';
  return 'info'; // same version — still info
}

interface NpmRegistryResponse {
  version: string;
  deprecated?: string;
}

async function fetchLatest(
  packageName: string,
  registryUrl: string,
): Promise<{ data: NpmRegistryResponse } | { error: string }> {
  try {
    const url = `${registryUrl}/${encodeURIComponent(packageName)}/latest`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return { error: `HTTP ${response.status} for ${packageName}` };
    }
    const data = (await response.json()) as NpmRegistryResponse;
    return { data };
  } catch (err) {
    return { error: `Failed to fetch ${packageName}: ${(err as Error).message}` };
  }
}

const depAudit: Module<DepAuditOptions> = {
  name: 'dep-audit',
  description: 'Audit package.json dependencies for outdated and deprecated packages',

  async validate(options): Promise<ModuleError | null> {
    if (!existsSync(options.targetPath)) {
      return {
        code: ModuleErrorCode.TARGET_NOT_FOUND,
        message: `Target path does not exist: ${options.targetPath}`,
        suggestion: 'Check the --target path and try again.',
      };
    }
    const pkgPath = join(options.targetPath, 'package.json');
    if (!existsSync(pkgPath)) {
      return {
        code: ModuleErrorCode.NO_PACKAGE_JSON,
        message: `No package.json found in ${options.targetPath}`,
        suggestion: 'Make sure you are targeting a Node.js project directory.',
      };
    }
    return null;
  },

  async execute(options): Promise<ModuleOutput> {
    const startTime = Date.now();
    const pkgPath = join(options.targetPath, 'package.json');
    const registryUrl = (options as Record<string, unknown>).registryUrl as string
      ?? 'https://registry.npmjs.org';

    let pkgJson: Record<string, unknown>;
    try {
      const raw = await readFile(pkgPath, 'utf-8');
      pkgJson = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      return {
        moduleName: this.name,
        success: false,
        error: {
          code: ModuleErrorCode.INTERNAL_ERROR,
          message: `Failed to read package.json: ${(err as Error).message}`,
        },
      };
    }

    // Collect dependencies based on flags
    const deps: Record<string, { version: string; type: 'prod' | 'dev' }> = {};

    if (!options.devOnly) {
      const prodDeps = (pkgJson.dependencies ?? {}) as Record<string, string>;
      for (const [name, version] of Object.entries(prodDeps)) {
        deps[name] = { version, type: 'prod' };
      }
    }

    if (!options.prodOnly) {
      const devDeps = (pkgJson.devDependencies ?? {}) as Record<string, string>;
      for (const [name, version] of Object.entries(devDeps)) {
        deps[name] = { version, type: 'dev' };
      }
    }

    const items: ResultItem[] = [];
    const warnings: ResultWarning[] = [];

    // Fetch latest versions in parallel
    const entries = Object.entries(deps);
    const results = await Promise.all(
      entries.map(([name]) => fetchLatest(name, registryUrl)),
    );

    for (let i = 0; i < entries.length; i++) {
      const [name, { version: currentVersionStr, type }] = entries[i];
      const result = results[i];

      if ('error' in result) {
        warnings.push({
          message: result.error,
          context: `Skipped checking ${name}`,
        });
        continue;
      }

      const { data } = result;
      const currentParsed = parseVersion(currentVersionStr);
      const latestParsed = parseVersion(data.version);

      // Check deprecated first — always critical
      if (data.deprecated) {
        const item: ResultItem = {
          file: 'package.json',
          severity: 'critical',
          message: `${name} is deprecated: ${data.deprecated}`,
          meta: {
            package: name,
            currentVersion: currentVersionStr,
            latestVersion: data.version,
            depType: type,
            deprecated: true,
          },
        };
        if (meetsThreshold(item.severity, options.severity)) {
          items.push(item);
        }
        continue;
      }

      if (!currentParsed || !latestParsed) {
        warnings.push({
          message: `Could not parse version for ${name}: current=${currentVersionStr}, latest=${data.version}`,
        });
        continue;
      }

      const severity = classifyVersionGap(currentParsed, latestParsed);

      // Skip up-to-date packages (same version = info with no real gap)
      if (
        currentParsed.major === latestParsed.major &&
        currentParsed.minor === latestParsed.minor &&
        currentParsed.patch === latestParsed.patch
      ) {
        continue;
      }

      const item: ResultItem = {
        file: 'package.json',
        severity,
        message: `${name} ${currentVersionStr} -> ${data.version} (${severity === 'error' ? 'major' : severity === 'warning' ? 'minor' : 'patch'} update available)`,
        meta: {
          package: name,
          currentVersion: currentVersionStr,
          latestVersion: data.version,
          depType: type,
        },
      };

      if (meetsThreshold(item.severity, options.severity)) {
        items.push(item);
      }
    }

    // Build summary
    const bySeverity: Record<Severity, number> = { info: 0, warning: 0, error: 0, critical: 0 };
    for (const item of items) {
      bySeverity[item.severity]++;
    }

    const output: ModuleResult = {
      moduleName: this.name,
      success: true,
      summary: {
        total: items.length,
        bySeverity,
        totalDependencies: entries.length,
        outdated: items.length,
      },
      items,
      warnings,
      durationMs: Date.now() - startTime,
    };

    return output;
  },
};

export default depAudit;
