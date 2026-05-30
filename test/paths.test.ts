import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  composeFile,
  registryFile,
  snapshotDir,
  snapshotFile,
  sproutHome,
  worktreeDir,
} from '../src/paths.js';

beforeEach(() => {
  vi.stubEnv('SPROUT_HOME', '/tmp/sprout-test-home');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('paths', () => {
  test('sproutHome honors SPROUT_HOME override', () => {
    expect(sproutHome()).toBe('/tmp/sprout-test-home');
  });

  test('falls back to ~/.sprout when SPROUT_HOME is unset', () => {
    vi.stubEnv('SPROUT_HOME', '');
    expect(sproutHome().endsWith('/.sprout')).toBe(true);
  });

  test('composes state paths under the home dir', () => {
    expect(registryFile()).toBe('/tmp/sprout-test-home/registry.json');
    expect(snapshotDir('sample')).toBe('/tmp/sprout-test-home/snapshots/sample');
    expect(snapshotFile('sample')).toBe('/tmp/sprout-test-home/snapshots/sample/base.dump');
    expect(worktreeDir('sample', 7)).toBe('/tmp/sprout-test-home/worktrees/sample/pr-7');
    expect(composeFile('sample', 7)).toBe('/tmp/sprout-test-home/compose/sample/pr-7.yml');
  });
});
