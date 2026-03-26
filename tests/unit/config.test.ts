import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { loadConfig, mergeWithCliFlags, validateConfig } from '../../src/shared/config.js';

function tmpFile(name?: string): string {
  return join(tmpdir(), name ?? `devkit-test-${randomUUID()}.json`);
}

describe('loadConfig', () => {
  it('returns defaults for non-existent path', async () => {
    const config = await loadConfig('/no/such/file/.devkitrc.json');
    expect(config.output?.format).toBe('color');
    expect(config.output?.verbose).toBe(false);
    expect(config.ignore).toContain('node_modules');
    expect(config.todo?.tags).toContain('TODO');
  });

  it('merges valid config file with defaults', async () => {
    const path = tmpFile();
    try {
      await writeFile(path, JSON.stringify({ output: { verbose: true }, ignore: ['vendor'] }));
      const config = await loadConfig(path);
      // Overridden values
      expect(config.output?.verbose).toBe(true);
      expect(config.ignore).toEqual(['vendor']);
      // Defaults preserved via deep merge
      expect(config.output?.format).toBe('color');
      expect(config.todo?.tags).toContain('TODO');
    } finally {
      await unlink(path).catch(() => {});
    }
  });

  it('throws on malformed JSON in existing file', async () => {
    const path = tmpFile();
    try {
      await writeFile(path, '{ not valid json!!!');
      await expect(loadConfig(path)).rejects.toThrow(/Invalid config at/);
    } finally {
      await unlink(path).catch(() => {});
    }
  });

  it('throws on empty file', async () => {
    const path = tmpFile();
    try {
      await writeFile(path, '');
      await expect(loadConfig(path)).rejects.toThrow(/Invalid config at/);
    } finally {
      await unlink(path).catch(() => {});
    }
  });

  it('throws on valid JSON that is not an object', async () => {
    const path = tmpFile();
    try {
      await writeFile(path, '42');
      await expect(loadConfig(path)).rejects.toThrow(/Invalid config at/);
      await expect(loadConfig(path)).rejects.toThrow(/Config must be a JSON object/);
    } finally {
      await unlink(path).catch(() => {});
    }
  });

  it('throws on unknown keys in config file', async () => {
    const path = tmpFile();
    try {
      await writeFile(path, JSON.stringify({ badKey: true }));
      await expect(loadConfig(path)).rejects.toThrow(/Invalid config at/);
      await expect(loadConfig(path)).rejects.toThrow(/Unknown config key "badKey"/);
    } finally {
      await unlink(path).catch(() => {});
    }
  });
});

describe('mergeWithCliFlags', () => {
  it('empty flags returns config unchanged', () => {
    const base = {
      output: { format: 'color' as const, verbose: true },
      ignore: ['node_modules'],
      todo: { tags: ['TODO'] },
    };
    const result = mergeWithCliFlags(base, {});
    expect(result).toEqual(base);
  });

  it('CLI flags override file values', () => {
    const base = { output: { format: 'color' as const, verbose: false }, ignore: ['node_modules'] };
    const flags = { output: { format: 'json' as const } };
    const result = mergeWithCliFlags(base, flags);
    expect(result.output?.format).toBe('json');
  });

  it('deep merge preserves unspecified nested fields', () => {
    const base = {
      output: { format: 'color' as const, verbose: true },
      ignore: ['node_modules'],
      todo: { tags: ['TODO', 'FIXME'] },
    };
    const flags = { output: { format: 'plain' as const } };
    const result = mergeWithCliFlags(base, flags);
    // Overridden
    expect(result.output?.format).toBe('plain');
    // Preserved
    expect(result.output?.verbose).toBe(true);
    expect(result.ignore).toEqual(['node_modules']);
    expect(result.todo?.tags).toEqual(['TODO', 'FIXME']);
  });
});

describe('validateConfig', () => {
  it('throws on unknown top-level key with helpful message', () => {
    expect(() => validateConfig({ xyz: 123 })).toThrow(
      'Unknown config key "xyz". Valid keys are: output, ignore, todo, depAudit, gitStats, codeHealth',
    );
  });

  it('throws on wrong type for output.format', () => {
    expect(() => validateConfig({ output: { format: 'yaml' } })).toThrow(
      'Config error: output.format must be one of: color, plain, json',
    );
  });

  it('throws on wrong type for output.verbose', () => {
    expect(() => validateConfig({ output: { verbose: 'yes' } })).toThrow(
      'Config error: output.verbose must be a boolean',
    );
  });

  it('throws on non-string-array ignore', () => {
    expect(() => validateConfig({ ignore: [1, 2] })).toThrow(
      'Config error: ignore must be an array of strings',
    );
    expect(() => validateConfig({ ignore: 'node_modules' })).toThrow(
      'Config error: ignore must be an array of strings',
    );
  });

  it('throws when nested module config is not an object', () => {
    expect(() => validateConfig({ todo: 'bad' })).toThrow('Config error: todo must be an object');
    expect(() => validateConfig({ depAudit: [] })).toThrow('Config error: depAudit must be an object');
  });

  it('throws on non-object input', () => {
    expect(() => validateConfig('string')).toThrow('Config must be a JSON object');
    expect(() => validateConfig(null)).toThrow('Config must be a JSON object');
    expect(() => validateConfig([])).toThrow('Config must be a JSON object');
  });

  it('passes valid config through correctly', () => {
    const input = {
      output: { format: 'json', verbose: true },
      ignore: ['vendor'],
      todo: { tags: ['TODO'] },
      depAudit: { registryUrl: 'https://example.com' },
      gitStats: { defaultBranch: 'develop' },
      codeHealth: { maxFileSize: 1000 },
    };
    const result = validateConfig(input);
    expect(result).toEqual(input);
  });

  it('passes empty object (all optional)', () => {
    expect(validateConfig({})).toEqual({});
  });
});
