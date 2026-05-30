import { execa } from 'execa';

/** `git worktree add --detach <path> <ref>`. Pure. */
export function worktreeAddArgs(path: string, ref: string): string[] {
  return ['worktree', 'add', '--detach', path, ref];
}

/** `git worktree remove --force <path>`. Pure. */
export function worktreeRemoveArgs(path: string): string[] {
  return ['worktree', 'remove', '--force', path];
}

const git = (args: string[], repo: string) => execa('git', args, { cwd: repo, stdio: 'inherit' });

/**
 * Resolve a PR number to a git ref inside `repo`. Tries `gh pr view` first
 * (handles forks), then falls back to a local/remote branch named after the PR.
 */
export async function resolvePrRef(repo: string, pr: number): Promise<string> {
  try {
    const { stdout } = await execa(
      'gh',
      ['pr', 'view', String(pr), '--json', 'headRefOid', '-q', '.headRefOid'],
      {
        cwd: repo,
      },
    );
    const sha = stdout.trim();
    if (sha) {
      // Ensure the commit is fetched locally.
      await execa('git', ['fetch', 'origin', sha], { cwd: repo, stdio: 'inherit' }).catch(() => {});
      return sha;
    }
  } catch {
    // gh not available / not a PR number — fall through.
  }
  return `pr-${pr}`;
}

export function addWorktree(repo: string, path: string, ref: string) {
  return git(worktreeAddArgs(path, ref), repo);
}

export async function removeWorktree(repo: string, path: string) {
  await git(worktreeRemoveArgs(path), repo).catch(() => {});
  await git(['worktree', 'prune'], repo).catch(() => {});
}
