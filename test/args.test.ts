import { describe, expect, test } from 'vitest';
import { composeArgs } from '../src/docker.js';
import { worktreeAddArgs, worktreeRemoveArgs } from '../src/git.js';
import { dockerizeHost, pgDumpArgs, pgRestoreArgs } from '../src/postgres.js';

describe('composeArgs', () => {
  test('prefixes project + file before the subcommand', () => {
    expect(composeArgs('sprout-sample-1', '/c/pr-1.yml', ['up', '-d', '--build'])).toEqual([
      'compose',
      '-p',
      'sprout-sample-1',
      '-f',
      '/c/pr-1.yml',
      'up',
      '-d',
      '--build',
    ]);
  });
});

describe('git worktree args', () => {
  test('add uses detached checkout at a ref into a path', () => {
    expect(worktreeAddArgs('/wt/pr-1', 'origin/pr/1/head')).toEqual([
      'worktree',
      'add',
      '--detach',
      '/wt/pr-1',
      'origin/pr/1/head',
    ]);
  });

  test('remove forces removal of the worktree path', () => {
    expect(worktreeRemoveArgs('/wt/pr-1')).toEqual(['worktree', 'remove', '--force', '/wt/pr-1']);
  });
});

describe('dockerizeHost', () => {
  test('rewrites localhost to host.docker.internal', () => {
    expect(dockerizeHost('postgresql://u:p@localhost:55432/db')).toBe(
      'postgresql://u:p@host.docker.internal:55432/db',
    );
    expect(dockerizeHost('postgresql://u:p@127.0.0.1:5432/db')).toBe(
      'postgresql://u:p@host.docker.internal:5432/db',
    );
  });

  test('leaves remote hosts untouched', () => {
    const url = 'postgresql://u:p@db.prod.example.com:5432/app?sslmode=require';
    expect(dockerizeHost(url)).toBe(url);
  });
});

describe('postgres args', () => {
  test('pg_dump writes a custom-format dump to the out file', () => {
    expect(pgDumpArgs('postgres://u:p@h/db', '/snap/base.dump')).toEqual([
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--file=/snap/base.dump',
      'postgres://u:p@h/db',
    ]);
  });

  test('pg_restore targets the db, dropping/cleaning first', () => {
    expect(pgRestoreArgs('postgres://u:p@h/db', '/snap/base.dump')).toEqual([
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      '--dbname=postgres://u:p@h/db',
      '/snap/base.dump',
    ]);
  });
});
