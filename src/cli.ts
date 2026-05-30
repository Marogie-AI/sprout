#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { down } from './commands/down.js';
import { init } from './commands/init.js';
import { logs } from './commands/logs.js';
import { ls } from './commands/ls.js';
import { sharedDown, sharedUp } from './commands/shared.js';
import { snapshot } from './commands/snapshot.js';
import { up } from './commands/up.js';

const program = new Command();

program
  .name('sprout')
  .description('Per-PR Postgres branching + preview for any repo, locally via Docker.')
  .option('-C, --repo <path>', 'target repo containing sprout.yml', '.');

const repoOf = () => program.opts<{ repo: string }>().repo;
const fail = (e: unknown) => {
  console.error(pc.red('✗'), e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
};

program
  .command('init')
  .description('scaffold a sprout.yml in the target repo')
  .action(() => {
    try {
      init(repoOf());
    } catch (e) {
      fail(e);
    }
  });

program
  .command('snapshot')
  .description('pg_dump the production DB into a reusable base snapshot')
  .action(async () => {
    try {
      await snapshot(repoOf());
    } catch (e) {
      fail(e);
    }
  });

program
  .command('up <pr>')
  .description('spin up an isolated branch + preview for a PR')
  .option('--ref <ref>', 'git ref to check out instead of resolving the PR')
  .option('--skip-snapshot', 'do not restore the prod snapshot')
  .action(async (pr: string, opts: { ref?: string; skipSnapshot?: boolean }) => {
    try {
      await up({ repo: repoOf(), pr: Number(pr), ref: opts.ref, skipSnapshot: opts.skipSnapshot });
    } catch (e) {
      fail(e);
    }
  });

program
  .command('down <pr>')
  .description('tear down a PR branch (containers, volume, worktree)')
  .action(async (pr: string) => {
    try {
      await down(repoOf(), Number(pr));
    } catch (e) {
      fail(e);
    }
  });

program
  .command('ls')
  .description('list active branches')
  .action(() => ls());

program
  .command('logs [pr]')
  .description("stream a PR's logs, or print the Dozzle URL")
  .action(async (pr?: string) => {
    try {
      await logs(repoOf(), pr === undefined ? undefined : Number(pr));
    } catch (e) {
      fail(e);
    }
  });

const shared = program.command('shared').description('manage shared Caddy + Dozzle services');
shared.command('up').action(async () => {
  try {
    await sharedUp();
  } catch (e) {
    fail(e);
  }
});
shared.command('down').action(async () => {
  try {
    await sharedDown();
  } catch (e) {
    fail(e);
  }
});

program.parseAsync();
