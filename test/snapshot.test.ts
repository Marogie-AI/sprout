import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { snapshot } from '../src/commands/snapshot.js';

const repo = join(__dirname, 'fixtures', 'sample-app');

beforeEach(() => {
  vi.stubEnv('PROD_DATABASE_URL', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('snapshot', () => {
  test('fails fast (before touching docker) when the source env is unset', async () => {
    await expect(snapshot(repo)).rejects.toThrow(/PROD_DATABASE_URL.*not set/i);
  });
});
