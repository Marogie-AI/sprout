import { join, resolve } from 'node:path';
import pc from 'picocolors';
import { projectName } from '../compose.js';
import { loadConfigFile } from '../config.js';
import { compose } from '../docker.js';
import { composeFile } from '../paths.js';

/** Stream a PR's container logs, or point at Dozzle when no PR is given. */
export async function logs(repoArg: string, pr?: number): Promise<void> {
  if (pr === undefined) {
    console.log(pc.cyan('Dozzle (all branches): http://localhost:8080'));
    return;
  }
  const repo = resolve(repoArg);
  const cfg = loadConfigFile(join(repo, 'sprout.yml'));
  await compose(projectName(cfg, pr), composeFile(cfg.project, pr), ['logs', '-f']);
}
