import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pc from 'picocolors';
import { projectName } from '../compose.js';
import { loadConfigFile } from '../config.js';
import { compose } from '../docker.js';
import { removeWorktree } from '../git.js';
import { composeFile, registryFile, worktreeDir } from '../paths.js';
import { removeBranch } from '../registry.js';

export async function down(repoArg: string, pr: number): Promise<void> {
  const repo = resolve(repoArg);
  const cfg = loadConfigFile(join(repo, 'sprout.yml'));
  const name = projectName(cfg, pr);
  const cfile = composeFile(cfg.project, pr);

  if (existsSync(cfile)) {
    await compose(name, cfile, ['down', '-v']);
  } else {
    console.log(pc.yellow(`no compose file for PR ${pr}; nothing to stop`));
  }

  await removeWorktree(repo, worktreeDir(cfg.project, pr));
  removeBranch(registryFile(), cfg.project, pr);
  console.log(
    pc.green(`✓ branch ${cfg.project} #${pr} torn down (containers + volume + worktree)`),
  );
}
