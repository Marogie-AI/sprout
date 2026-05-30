import { execa } from 'execa';

/** Build `docker compose -p <project> -f <file> <subcommand...>`. Pure. */
export function composeArgs(projectName: string, composeFile: string, sub: string[]): string[] {
  return ['compose', '-p', projectName, '-f', composeFile, ...sub];
}

const run = (args: string[], opts: { cwd?: string } = {}) =>
  execa('docker', args, { stdio: 'inherit', cwd: opts.cwd });

export function compose(projectName: string, composeFile: string, sub: string[]) {
  return run(composeArgs(projectName, composeFile, sub));
}

/** Run a command inside the app service of a running project. */
export function composeExec(
  projectName: string,
  composeFile: string,
  service: string,
  cmd: string,
) {
  return run(composeArgs(projectName, composeFile, ['exec', '-T', service, 'sh', '-lc', cmd]));
}

/** Ensure the shared external network exists (idempotent). */
export async function ensureNetwork(name: string) {
  try {
    await execa('docker', ['network', 'inspect', name], { stdio: 'ignore' });
  } catch {
    await execa('docker', ['network', 'create', name], { stdio: 'inherit' });
  }
}

/** Wait until the db service reports healthy, polling up to `timeoutMs`. */
export async function waitHealthy(
  projectName: string,
  service: string,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { stdout } = await execa('docker', [
      'ps',
      '--filter',
      `label=com.docker.compose.project=${projectName}`,
      '--filter',
      `label=com.docker.compose.service=${service}`,
      '--format',
      '{{.Status}}',
    ]);
    if (stdout.includes('(healthy)')) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for ${service} in ${projectName} to become healthy`);
}
