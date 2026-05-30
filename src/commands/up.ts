import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import pc from 'picocolors';
import { stringify as toYaml } from 'yaml';
import { SHARED_NETWORK, projectName, renderCompose, renderDomain } from '../compose.js';
import { type SproutConfig, loadConfigFile } from '../config.js';
import { compose, composeExec, ensureNetwork, waitHealthy } from '../docker.js';
import { addWorktree, resolvePrRef } from '../git.js';
import { composeFile, snapshotDir, snapshotFile, worktreeDir } from '../paths.js';
import { registryFile } from '../paths.js';
import { addBranch } from '../registry.js';
import { sharedUp } from './shared.js';

/** Connection URL the db container uses to talk to itself for restore/migrate. */
function localRestoreUrl(cfg: SproutConfig): string {
  const user = encodeURIComponent(cfg.db.user);
  const pass = encodeURIComponent(cfg.db.password);
  return `postgresql://${user}:${pass}@localhost:5432/${cfg.db.database}`;
}

export interface UpOptions {
  repo: string;
  pr: number;
  /** Override the git ref instead of resolving the PR (e.g. a local branch). */
  ref?: string;
  skipSnapshot?: boolean;
}

export async function up(opts: UpOptions): Promise<void> {
  const repo = resolve(opts.repo);
  const cfg = loadConfigFile(join(repo, 'sprout.yml'));
  const { pr } = opts;
  const name = projectName(cfg, pr);
  const domain = renderDomain(cfg, pr);

  await ensureNetwork(SHARED_NETWORK);
  await sharedUp();

  // 1. Worktree for the PR (isolated from the user's working tree).
  const wt = worktreeDir(cfg.project, pr);
  if (!existsSync(wt)) {
    const ref = opts.ref ?? (await resolvePrRef(repo, pr));
    console.log(pc.dim(`git worktree → ${wt} @ ${ref}`));
    mkdirSync(dirname(wt), { recursive: true });
    await addWorktree(repo, wt, ref);
  }

  // 2. Render + write the per-PR compose file.
  const envFile = cfg.app.env_file ? join(repo, cfg.app.env_file) : undefined;
  if (envFile && !existsSync(envFile)) {
    console.log(pc.yellow(`! env_file ${envFile} not found — app may lack secrets`));
  }
  const snapDir = snapshotDir(cfg.project);
  mkdirSync(snapDir, { recursive: true });
  const { compose: composeObj } = renderCompose(cfg, {
    pr,
    buildContext: wt,
    envFilePath: envFile && existsSync(envFile) ? envFile : undefined,
    snapshotDir: snapDir,
  });
  const cfile = composeFile(cfg.project, pr);
  mkdirSync(dirname(cfile), { recursive: true });
  writeFileSync(cfile, toYaml(composeObj));

  // 3. Build + start.
  await compose(name, cfile, ['up', '-d', '--build']);
  await waitHealthy(name, 'db');

  // 4. Restore the prod snapshot into the branch DB (inside the db container).
  const dump = snapshotFile(cfg.project);
  if (!opts.skipSnapshot && existsSync(dump)) {
    console.log(pc.dim('restoring snapshot into branch db…'));
    await composeExec(
      name,
      cfile,
      'db',
      `pg_restore --clean --if-exists --no-owner --no-acl --dbname='${localRestoreUrl(cfg)}' /snapshots/base.dump || true`,
    );
  } else {
    console.log(
      pc.yellow('no snapshot found — starting from empty schema (run `sprout snapshot`)'),
    );
  }

  // 5. Migrate + optional seed inside the app container.
  console.log(pc.dim(`migrate: ${cfg.db.migrate}`));
  await composeExec(name, cfile, 'app', cfg.db.migrate);
  if (cfg.db.seed) {
    console.log(pc.dim(`seed: ${cfg.db.seed}`));
    await composeExec(name, cfile, 'app', cfg.db.seed);
  }

  // 6. Track it.
  addBranch(registryFile(), {
    project: cfg.project,
    pr,
    projectName: name,
    domain,
    worktree: wt,
    createdAt: new Date().toISOString(),
  });

  console.log(pc.green(`\n✓ branch up → http://${domain}`));
  console.log(pc.dim('  logs: http://localhost:8080  (Dozzle)'));
}
