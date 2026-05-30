import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { addBranch, getBranch, listBranches, removeBranch } from '../src/registry.js';

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sprout-reg-'));
  file = join(dir, 'registry.json');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const entry = {
  project: 'sample',
  pr: 1,
  projectName: 'sprout-sample-1',
  domain: '1.sample.localhost',
  worktree: '/wt/pr-1',
  createdAt: '2026-05-30T00:00:00Z',
};

describe('registry', () => {
  test('listBranches is empty when no file exists', () => {
    expect(listBranches(file)).toEqual([]);
  });

  test('addBranch persists an entry that listBranches returns', () => {
    addBranch(file, entry);
    expect(listBranches(file)).toEqual([entry]);
  });

  test('addBranch replaces an entry with the same project+pr', () => {
    addBranch(file, entry);
    addBranch(file, { ...entry, domain: 'changed' });
    const all = listBranches(file);
    expect(all).toHaveLength(1);
    expect(all[0]?.domain).toBe('changed');
  });

  test('getBranch finds by project and pr', () => {
    addBranch(file, entry);
    addBranch(file, { ...entry, pr: 2, projectName: 'sprout-sample-2' });
    expect(getBranch(file, 'sample', 2)?.projectName).toBe('sprout-sample-2');
    expect(getBranch(file, 'sample', 99)).toBeUndefined();
  });

  test('removeBranch deletes only the matching entry', () => {
    addBranch(file, entry);
    addBranch(file, { ...entry, pr: 2 });
    removeBranch(file, 'sample', 1);
    const all = listBranches(file);
    expect(all).toHaveLength(1);
    expect(all[0]?.pr).toBe(2);
  });
});
