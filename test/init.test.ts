import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { init } from '../src/commands/init.js';
import { parseConfig } from '../src/config.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sprout-init-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('init', () => {
  test('writes a sprout.yml that parses against the schema', () => {
    init(dir);
    const dest = join(dir, 'sprout.yml');
    expect(existsSync(dest)).toBe(true);
    // The scaffold must itself be valid config.
    expect(() => parseConfig(readFileSync(dest, 'utf8'))).not.toThrow();
  });

  test('does not overwrite an existing sprout.yml', () => {
    const dest = join(dir, 'sprout.yml');
    writeFileSync(dest, 'project: keepme\n');
    init(dir);
    expect(readFileSync(dest, 'utf8')).toBe('project: keepme\n');
  });
});
