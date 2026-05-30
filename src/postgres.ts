import { execa } from 'execa';

/** `pg_dump` args producing a custom-format, ownership-free dump. Pure. */
export function pgDumpArgs(sourceUrl: string, outFile: string): string[] {
  return ['--format=custom', '--no-owner', '--no-acl', `--file=${outFile}`, sourceUrl];
}

/** `pg_restore` args that drop/recreate objects into the target db. Pure. */
export function pgRestoreArgs(targetUrl: string, dumpFile: string): string[] {
  return ['--clean', '--if-exists', '--no-owner', '--no-acl', `--dbname=${targetUrl}`, dumpFile];
}

/**
 * Rewrite a localhost source URL so a container can reach the host's Postgres.
 * Remote hosts are returned unchanged. Pure.
 */
export function dockerizeHost(url: string): string {
  return url.replace(/@(localhost|127\.0\.0\.1)(?=[:/])/, '@host.docker.internal');
}

/**
 * Dump the production database using a containerized pg_dump that matches the
 * configured engine version — avoids depending on host Postgres tools / version.
 * Writes <snapshotDir>/base.dump on the host (mounted into the container).
 */
export function pgDump(engine: string, sourceUrl: string, snapshotDir: string) {
  return execa(
    'docker',
    [
      'run',
      '--rm',
      '--add-host',
      'host.docker.internal:host-gateway',
      '-v',
      `${snapshotDir}:/snap`,
      engine,
      'pg_dump',
      ...pgDumpArgs(dockerizeHost(sourceUrl), '/snap/base.dump'),
    ],
    { stdio: 'inherit' },
  );
}
