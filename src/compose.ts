import type { SproutConfig } from './config.js';
import { buildConnectionEnv } from './url.js';

export const SHARED_NETWORK = 'sprout-net';

/** Docker compose project name — isolates containers/network/volume per PR. */
export function projectName(cfg: SproutConfig, pr: number): string {
  return `sprout-${cfg.project}-${pr}`;
}

/** Resolve the proxy domain template for a PR (e.g. "123.sample.localhost"). */
export function renderDomain(cfg: SproutConfig, pr: number): string {
  return cfg.proxy.domain.replaceAll('{pr}', String(pr)).replaceAll('{project}', cfg.project);
}

export interface RenderOptions {
  pr: number;
  /** Absolute path to the PR worktree, used as the docker build context. */
  buildContext: string;
  /** Absolute path to the secrets env_file, if the repo declares one. */
  envFilePath?: string;
  /** Absolute path to the host snapshot dir, bind-mounted into db at /snapshots. */
  snapshotDir?: string;
}

export interface ComposeService {
  image?: string;
  build?: { context: string; dockerfile: string; args?: Record<string, string> };
  environment?: Record<string, string>;
  env_file?: string[];
  volumes?: string[];
  depends_on?: Record<string, { condition: string }>;
  healthcheck?: { test: string[]; interval: string; timeout: string; retries: number };
  labels?: Record<string, string>;
  networks?: string[];
  restart?: string;
}

export interface ComposeFile {
  services: { db: ComposeService; app: ComposeService };
  volumes: Record<string, Record<string, never>>;
  networks: Record<string, { external?: boolean; name?: string }>;
}

export interface RenderResult {
  projectName: string;
  domain: string;
  compose: ComposeFile;
}

/** Build the per-PR compose object from config. Pure — no IO. */
export function renderCompose(cfg: SproutConfig, opts: RenderOptions): RenderResult {
  const domain = renderDomain(cfg, opts.pr);

  const db: ComposeService = {
    image: cfg.db.engine,
    environment: {
      POSTGRES_USER: cfg.db.user,
      POSTGRES_PASSWORD: cfg.db.password,
      POSTGRES_DB: cfg.db.database,
    },
    volumes: ['pgdata:/var/lib/postgresql/data'],
    healthcheck: {
      test: ['CMD-SHELL', `pg_isready -U ${cfg.db.user} -d ${cfg.db.database}`],
      interval: '5s',
      timeout: '5s',
      retries: 10,
    },
    networks: ['default'],
    restart: 'unless-stopped',
  };

  if (opts.snapshotDir) {
    db.volumes = [...(db.volumes ?? []), `${opts.snapshotDir}:/snapshots:ro`];
  }

  const app: ComposeService = {
    build: {
      context: opts.buildContext,
      dockerfile: cfg.app.build.dockerfile,
      args: cfg.app.build.args,
    },
    depends_on: { db: { condition: 'service_healthy' } },
    environment: {
      // Connection env is injected last so user-declared app.env can never
      // clobber the authoritative branch DB URL.
      ...cfg.app.env,
      ...buildConnectionEnv(cfg.db),
    },
    labels: {
      // http:// prefix keeps Caddy on plain :80 (no auto-HTTPS) for local previews.
      caddy: `http://${domain}`,
      'caddy.reverse_proxy': `{{upstreams ${cfg.app.port}}}`,
    },
    networks: ['default', SHARED_NETWORK],
    restart: 'unless-stopped',
  };

  if (opts.envFilePath) {
    app.env_file = [opts.envFilePath];
  }

  return {
    projectName: projectName(cfg, opts.pr),
    domain,
    compose: {
      services: { db, app },
      volumes: { pgdata: {} },
      networks: {
        default: {},
        [SHARED_NETWORK]: { external: true, name: SHARED_NETWORK },
      },
    },
  };
}
