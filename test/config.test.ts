import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadConfigFile, parseConfig } from '../src/config.js';

const minimal = `
project: sample
app:
  build:
    dockerfile: Dockerfile
  port: 3000
  env_file: .env.preview
db:
  database: appdb
  snapshot:
    source_env: PROD_DATABASE_URL
  migrate: "pnpm db:migrate"
`;

describe('parseConfig', () => {
  test('parses a minimal config and fills sensible defaults', () => {
    const cfg = parseConfig(minimal);
    expect(cfg.project).toBe('sample');
    expect(cfg.app.port).toBe(3000);
    expect(cfg.app.build.context).toBe('.');
    // db defaults
    expect(cfg.db.engine).toBe('postgres:16-alpine');
    expect(cfg.db.user).toBe('postgres');
    expect(cfg.db.password).toBe('postgres');
    expect(cfg.db.internal_host).toBe('db');
    expect(cfg.db.url_var).toBe('DATABASE_URL');
    expect(cfg.db.mirror_vars).toEqual([]);
    expect(cfg.db.seed).toBeUndefined();
    // proxy default
    expect(cfg.proxy.domain).toBe('{pr}.{project}.localhost');
  });

  test('keeps explicit overrides', () => {
    const cfg = parseConfig(`
project: werkup
app:
  build: { dockerfile: Dockerfile }
  port: 8080
  env_file: .env.preview
db:
  database: werkup
  user: app
  password: secret
  mirror_vars: [DATABASE_URL_UNPOOLED]
  snapshot: { source_env: PROD_DATABASE_URL }
  migrate: "npm run migrate"
  seed: "npm run seed"
proxy:
  domain: "pr{pr}.werkup.test"
`);
    expect(cfg.app.port).toBe(8080);
    expect(cfg.db.user).toBe('app');
    expect(cfg.db.mirror_vars).toEqual(['DATABASE_URL_UNPOOLED']);
    expect(cfg.db.seed).toBe('npm run seed');
    expect(cfg.proxy.domain).toBe('pr{pr}.werkup.test');
  });

  test('rejects config missing required project', () => {
    expect(() => parseConfig('app:\n  build: {}\n')).toThrow(/project/i);
  });

  test('defaults app.env and build.args to empty objects', () => {
    const cfg = parseConfig(minimal);
    expect(cfg.app.env).toEqual({});
    expect(cfg.app.build.args).toEqual({});
  });

  test('rejects a non-numeric port', () => {
    expect(() =>
      parseConfig(
        'project: x\napp:\n  build: {}\n  port: notaport\n  env_file: .env\ndb:\n  database: d\n  snapshot: { source_env: P }\n  migrate: m\n',
      ),
    ).toThrow();
  });

  test('loadConfigFile reads and validates the bundled fixture sprout.yml', () => {
    const cfg = loadConfigFile(join(__dirname, 'fixtures', 'sample-app', 'sprout.yml'));
    expect(cfg.project).toBe('sample');
    expect(cfg.db.migrate).toBe('node migrate.js');
  });
});
