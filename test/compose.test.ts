import { describe, expect, test } from 'vitest';
import { projectName, renderCompose, renderDomain } from '../src/compose.js';
import { parseConfig } from '../src/config.js';

const cfg = parseConfig(`
project: sample
app:
  build: { dockerfile: Dockerfile, context: . }
  port: 3000
  env_file: .env.preview
  env: { NODE_ENV: production }
db:
  database: appdb
  mirror_vars: [DATABASE_URL_UNPOOLED]
  snapshot: { source_env: PROD_DATABASE_URL }
  migrate: "pnpm db:migrate"
`);

describe('projectName', () => {
  test('namespaces by project and pr', () => {
    expect(projectName(cfg, 123)).toBe('sprout-sample-123');
  });
});

describe('renderDomain', () => {
  test('substitutes {pr} and {project}', () => {
    expect(renderDomain(cfg, 123)).toBe('123.sample.localhost');
  });
});

describe('renderCompose', () => {
  const out = renderCompose(cfg, {
    pr: 123,
    buildContext: '/abs/worktree',
    envFilePath: '/abs/.env.preview',
  });

  test('returns the namespaced project name', () => {
    expect(out.projectName).toBe('sprout-sample-123');
  });

  test('db service uses the engine image and postgres env', () => {
    const db = out.compose.services.db;
    expect(db.image).toBe('postgres:16-alpine');
    expect(db.environment).toMatchObject({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'appdb',
    });
    expect(db.healthcheck?.test.join(' ')).toContain('pg_isready');
  });

  test('app service injects the connection string + mirror var + inline env', () => {
    const app = out.compose.services.app;
    expect(app.environment).toMatchObject({
      DATABASE_URL: 'postgresql://postgres:postgres@db:5432/appdb',
      DATABASE_URL_UNPOOLED: 'postgresql://postgres:postgres@db:5432/appdb',
      NODE_ENV: 'production',
    });
  });

  test('app builds from the worktree context and waits for db health', () => {
    const app = out.compose.services.app;
    expect(app.build).toMatchObject({ context: '/abs/worktree', dockerfile: 'Dockerfile' });
    expect(app.depends_on?.db?.condition).toBe('service_healthy');
    expect(app.env_file).toEqual(['/abs/.env.preview']);
  });

  test('app carries caddy labels routing the domain to its port', () => {
    const app = out.compose.services.app;
    // http:// prefix disables Caddy auto-HTTPS so local previews serve on plain :80
    expect(app.labels?.caddy).toBe('http://123.sample.localhost');
    expect(app.labels?.['caddy.reverse_proxy']).toBe('{{upstreams 3000}}');
    expect(app.networks).toContain('sprout-net');
  });

  test('inline app.env cannot clobber the injected connection string', () => {
    const hijack = parseConfig(`
project: sample
app:
  build: { dockerfile: Dockerfile }
  port: 3000
  env: { DATABASE_URL: "postgres://evil@elsewhere/x", NODE_ENV: production }
db:
  database: appdb
  snapshot: { source_env: PROD }
  migrate: "m"
`);
    const out = renderCompose(hijack, { pr: 1, buildContext: '/wt' });
    expect(out.compose.services.app.environment?.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@db:5432/appdb',
    );
    expect(out.compose.services.app.environment?.NODE_ENV).toBe('production');
  });

  test('passes build args through to the app build', () => {
    const withArgs = parseConfig(`
project: sample
app:
  build: { dockerfile: Dockerfile, args: { FOO: bar } }
  port: 3000
db:
  database: appdb
  snapshot: { source_env: PROD }
  migrate: "m"
`);
    const out = renderCompose(withArgs, { pr: 1, buildContext: '/wt' });
    expect(out.compose.services.app.build?.args).toEqual({ FOO: 'bar' });
  });

  test('omits the snapshot mount when no snapshot dir is given', () => {
    const out = renderCompose(cfg, { pr: 1, buildContext: '/wt' });
    expect(out.compose.services.db.volumes).toEqual(['pgdata:/var/lib/postgresql/data']);
  });

  test('both services restart unless-stopped', () => {
    expect(out.compose.services.db.restart).toBe('unless-stopped');
    expect(out.compose.services.app.restart).toBe('unless-stopped');
  });

  test('bind-mounts the snapshot dir into db when provided', () => {
    const withSnap = renderCompose(cfg, {
      pr: 1,
      buildContext: '/wt',
      snapshotDir: '/snap/sample',
    });
    expect(withSnap.compose.services.db.volumes).toContain('/snap/sample:/snapshots:ro');
  });

  test('declares the external shared network and a per-project volume', () => {
    expect(out.compose.networks['sprout-net']).toMatchObject({
      external: true,
      name: 'sprout-net',
    });
    expect(out.compose.volumes).toHaveProperty('pgdata');
  });

  test('omits env_file when none provided', () => {
    const noEnv = renderCompose(cfg, { pr: 7, buildContext: '/wt' });
    expect(noEnv.compose.services.app.env_file).toBeUndefined();
  });
});
