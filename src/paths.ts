import { homedir } from 'node:os';
import { join } from 'node:path';

/** Root of sprout's local state. Override with SPROUT_HOME (used in tests). */
export function sproutHome(): string {
  return process.env.SPROUT_HOME?.trim() || join(homedir(), '.sprout');
}

export function registryFile(): string {
  return join(sproutHome(), 'registry.json');
}

export function snapshotDir(project: string): string {
  return join(sproutHome(), 'snapshots', project);
}

export function snapshotFile(project: string): string {
  return join(snapshotDir(project), 'base.dump');
}

export function worktreeDir(project: string, pr: number): string {
  return join(sproutHome(), 'worktrees', project, `pr-${pr}`);
}

export function composeFile(project: string, pr: number): string {
  return join(sproutHome(), 'compose', project, `pr-${pr}.yml`);
}
