import { readFile } from 'node:fs/promises';

export type OutputMode = 'color' | 'plain' | 'json';

export interface DevKitConfig {
  output?: { format?: OutputMode; verbose?: boolean };
  ignore?: string[];
  todo?: { tags?: string[]; ignorePaths?: string[] };
  depAudit?: { registryUrl?: string; ignoreDeps?: string[] };
  gitStats?: { defaultBranch?: string; since?: string };
  codeHealth?: { maxFileSize?: number; complexityThreshold?: number };
}

const DEFAULTS: DevKitConfig = {
  output: { format: 'color', verbose: false },
  ignore: ['node_modules', 'dist', '.git', 'coverage'],
  todo: { tags: ['TODO', 'FIXME', 'HACK', 'XXX'] },
  depAudit: { registryUrl: 'https://registry.npmjs.org' },
  gitStats: { defaultBranch: 'main' },
  codeHealth: { maxFileSize: 500, complexityThreshold: 10 },
};

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const val = override[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof base[key] === 'object') {
      result[key] = deepMerge(base[key] as Record<string, unknown>, val as Record<string, unknown>);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

export async function loadConfig(configPath: string): Promise<DevKitConfig> {
  try {
    const raw = await readFile(configPath, 'utf-8');
    return deepMerge(DEFAULTS as unknown as Record<string, unknown>, JSON.parse(raw)) as unknown as DevKitConfig;
  } catch {
    return { ...DEFAULTS };
  }
}
