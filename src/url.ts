/** Inputs needed to build the in-cluster Postgres connection string. */
export interface DbConnection {
  user: string;
  password: string;
  internal_host: string;
  database: string;
  url_var: string;
  mirror_vars: string[];
}

/**
 * Build the connection string the app container uses to reach its branch DB.
 * Host is the internal docker service name, so the URL is identical for every
 * PR — the isolation comes from the per-PR docker network, not the string.
 */
export function buildConnectionString(db: DbConnection): string {
  const user = encodeURIComponent(db.user);
  const password = encodeURIComponent(db.password);
  return `postgresql://${user}:${password}@${db.internal_host}:5432/${db.database}`;
}

/**
 * Map the connection string into the env var the app reads (`url_var`) plus any
 * `mirror_vars` (e.g. DATABASE_URL_UNPOOLED) that should hold the same value.
 */
export function buildConnectionEnv(db: DbConnection): Record<string, string> {
  const url = buildConnectionString(db);
  const env: Record<string, string> = { [db.url_var]: url };
  for (const key of db.mirror_vars) {
    env[key] = url;
  }
  return env;
}
