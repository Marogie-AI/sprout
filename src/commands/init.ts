import { existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pc from 'picocolors';

const TEMPLATE = `# sprout config — per-PR Postgres branch + preview for this repo.
project: my-app                 # namespace for containers / snapshots / domains

app:
  build:
    context: .
    dockerfile: Dockerfile      # this repo must be Docker-buildable
  port: 3000                    # the app's internal listen port
  env_file: .env.preview        # secrets injected into the app container (optional)
  env:
    NODE_ENV: production

db:
  engine: postgres:16-alpine
  database: appdb
  user: postgres
  password: postgres
  internal_host: db             # docker service name the app connects to
  url_var: DATABASE_URL         # env var your app reads; sprout fills it in
  mirror_vars: []               # e.g. [DATABASE_URL_UNPOOLED]
  snapshot:
    source_env: PROD_DATABASE_URL   # env var holding the prod URL to pg_dump
  migrate: "pnpm db:migrate"    # runs inside the app container after restore
  # seed: "pnpm db:seed"        # optional

proxy:
  domain: "{pr}.{project}.localhost"
`;

export function init(repoArg: string): void {
  const repo = resolve(repoArg);
  const dest = join(repo, 'sprout.yml');
  if (existsSync(dest)) {
    console.log(pc.yellow(`sprout.yml already exists at ${dest}`));
    return;
  }
  writeFileSync(dest, TEMPLATE);
  console.log(pc.green('✓ created'), dest);
  console.log(pc.dim('Edit it, add a Dockerfile, then run: sprout snapshot && sprout up <pr>'));
}
