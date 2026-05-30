import { execa } from 'execa';
import pc from 'picocolors';
import { templatePath } from '../assets.js';
import { SHARED_NETWORK } from '../compose.js';
import { ensureNetwork } from '../docker.js';

const SHARED_PROJECT = 'sprout-shared';

export async function sharedUp(): Promise<void> {
  await ensureNetwork(SHARED_NETWORK);
  const tpl = templatePath('compose.shared.yml');
  await execa('docker', ['compose', '-p', SHARED_PROJECT, '-f', tpl, 'up', '-d'], {
    stdio: 'inherit',
  });
  console.log(pc.green('✓ shared services up:'), 'Caddy :80, Dozzle http://localhost:8080');
}

export async function sharedDown(): Promise<void> {
  const tpl = templatePath('compose.shared.yml');
  await execa('docker', ['compose', '-p', SHARED_PROJECT, '-f', tpl, 'down'], { stdio: 'inherit' });
  console.log(pc.yellow('shared services stopped'));
}
