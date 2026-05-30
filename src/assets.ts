import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Resolve a bundled template path. Works whether running from source
 * (src/cli.ts via tsx, templates at ./templates) or built (dist/cli.js,
 * templates shipped at ../src/templates).
 */
export function templatePath(name: string): string {
  const candidates = [
    new URL(`./templates/${name}`, import.meta.url),
    new URL(`../src/templates/${name}`, import.meta.url),
  ].map((u) => fileURLToPath(u));
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(`Bundled template not found: ${name} (looked in ${candidates.join(', ')})`);
  }
  return found;
}
