import { describe, expect, test } from 'vitest';
import { templatePath } from '../src/assets.js';

describe('templatePath', () => {
  test('resolves a bundled template that exists', () => {
    const p = templatePath('compose.shared.yml');
    expect(p.endsWith('templates/compose.shared.yml')).toBe(true);
  });

  test('throws a helpful error for a missing template', () => {
    expect(() => templatePath('does-not-exist.yml')).toThrow(/not found/i);
  });
});
