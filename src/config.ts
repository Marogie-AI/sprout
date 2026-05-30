import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

const buildSchema = z.object({
  context: z.string().default('.'),
  dockerfile: z.string().default('Dockerfile'),
  args: z.record(z.string()).default({}),
});

const snapshotSchema = z.object({
  source_env: z.string(),
});

const dbSchema = z.object({
  engine: z.string().default('postgres:16-alpine'),
  database: z.string(),
  user: z.string().default('postgres'),
  password: z.string().default('postgres'),
  internal_host: z.string().default('db'),
  url_var: z.string().default('DATABASE_URL'),
  mirror_vars: z.array(z.string()).default([]),
  snapshot: snapshotSchema,
  migrate: z.string(),
  seed: z.string().optional(),
});

const appSchema = z.object({
  build: buildSchema.default({}),
  port: z.number().int().positive(),
  env_file: z.string().optional(),
  env: z.record(z.string()).default({}),
});

const proxySchema = z
  .object({
    domain: z.string().default('{pr}.{project}.localhost'),
  })
  .default({});

export const configSchema = z.object({
  project: z.string().min(1),
  app: appSchema,
  db: dbSchema,
  proxy: proxySchema,
});

export type SproutConfig = z.infer<typeof configSchema>;

/** Parse and validate a sprout.yml string, applying defaults. Throws on invalid input. */
export function parseConfig(yamlText: string): SproutConfig {
  const raw = parseYaml(yamlText);
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid sprout.yml:\n${issues}`);
  }
  return result.data;
}

/** Read and validate a sprout.yml from disk. */
export function loadConfigFile(path: string): SproutConfig {
  return parseConfig(readFileSync(path, 'utf8'));
}
