import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { loadConfigFile } from '../config.js';
import { snapshotDir, snapshotFile } from '../paths.js';
import { pgDump } from '../postgres.js';

export async function snapshot(repo: string): Promise<void> {
  const cfg = loadConfigFile(join(repo, 'sprout.yml'));
  const sourceUrl = process.env[cfg.db.snapshot.source_env]?.trim();
  if (!sourceUrl) {
    throw new Error(
      `Snapshot source env "${cfg.db.snapshot.source_env}" is not set. Export it with the production connection string before running snapshot.`,
    );
  }
  const dir = snapshotDir(cfg.project);
  mkdirSync(dir, { recursive: true });
  console.log(pc.dim(`pg_dump (via ${cfg.db.engine}) → ${snapshotFile(cfg.project)}`));
  await pgDump(cfg.db.engine, sourceUrl, dir);
  console.log(pc.green('✓ snapshot saved:'), snapshotFile(cfg.project));
}
