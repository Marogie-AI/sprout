import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** A live PR branch tracked by sprout. */
export interface BranchEntry {
  project: string;
  pr: number;
  projectName: string;
  domain: string;
  worktree: string;
  createdAt: string;
}

function read(file: string): BranchEntry[] {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as BranchEntry[];
  } catch {
    return [];
  }
}

function write(file: string, entries: BranchEntry[]): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
}

const sameBranch = (e: BranchEntry, project: string, pr: number) =>
  e.project === project && e.pr === pr;

export function listBranches(file: string): BranchEntry[] {
  return read(file);
}

export function getBranch(file: string, project: string, pr: number): BranchEntry | undefined {
  return read(file).find((e) => sameBranch(e, project, pr));
}

/** Insert or replace the entry for this project+pr. */
export function addBranch(file: string, entry: BranchEntry): void {
  const entries = read(file).filter((e) => !sameBranch(e, entry.project, entry.pr));
  entries.push(entry);
  write(file, entries);
}

export function removeBranch(file: string, project: string, pr: number): void {
  write(
    file,
    read(file).filter((e) => !sameBranch(e, project, pr)),
  );
}
