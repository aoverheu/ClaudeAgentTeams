import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

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

const VALID_KEYS = ['output', 'ignore', 'todo', 'depAudit', 'gitStats', 'codeHealth'] as const;
const VALID_OUTPUT_FORMATS: OutputMode[] = ['color', 'plain', 'json'];

export function validateConfig(raw: unknown): DevKitConfig {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Config must be a JSON object');
  }

  const obj = raw as Record<string, unknown>;

  // Reject unknown top-level keys
  for (const key of Object.keys(obj)) {
    if (!(VALID_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unknown config key "${key}". Valid keys are: ${VALID_KEYS.join(', ')}`);
    }
  }

  // Validate output
  if (obj.output !== undefined) {
    if (typeof obj.output !== 'object' || obj.output === null || Array.isArray(obj.output)) {
      throw new Error('Config error: output must be an object');
    }
    const output = obj.output as Record<string, unknown>;
    if (output.format !== undefined) {
      if (!VALID_OUTPUT_FORMATS.includes(output.format as OutputMode)) {
        throw new Error(`Config error: output.format must be one of: ${VALID_OUTPUT_FORMATS.join(', ')}`);
      }
    }
    if (output.verbose !== undefined && typeof output.verbose !== 'boolean') {
      throw new Error('Config error: output.verbose must be a boolean');
    }
  }

  // Validate ignore
  if (obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore) || !obj.ignore.every((item: unknown) => typeof item === 'string')) {
      throw new Error('Config error: ignore must be an array of strings');
    }
  }

  // Validate remaining nested fields are objects if present
  for (const key of ['todo', 'depAudit', 'gitStats', 'codeHealth'] as const) {
    if (obj[key] !== undefined) {
      if (typeof obj[key] !== 'object' || obj[key] === null || Array.isArray(obj[key])) {
        throw new Error(`Config error: ${key} must be an object`);
      }
    }
  }

  return obj as DevKitConfig;
}

export function mergeWithCliFlags(config: DevKitConfig, flags: Partial<DevKitConfig>): DevKitConfig {
  return deepMerge(
    config as unknown as Record<string, unknown>,
    flags as unknown as Record<string, unknown>,
  ) as unknown as DevKitConfig;
}

export async function loadConfig(configPath: string): Promise<DevKitConfig> {
  if (!existsSync(configPath)) {
    return { ...DEFAULTS };
  }
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    const validated = validateConfig(parsed);
    return deepMerge(DEFAULTS as unknown as Record<string, unknown>, validated as unknown as Record<string, unknown>) as unknown as DevKitConfig;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid config at ${configPath}: ${message}`);
  }
}
