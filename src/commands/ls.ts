import pc from 'picocolors';
import { registryFile } from '../paths.js';
import { listBranches } from '../registry.js';

export function ls(): void {
  const branches = listBranches(registryFile());
  if (branches.length === 0) {
    console.log(pc.dim('no active sprout branches'));
    return;
  }
  console.log(pc.bold('PROJECT'.padEnd(16)), 'PR'.padEnd(6), 'URL'.padEnd(34), 'CREATED');
  for (const b of branches) {
    console.log(
      b.project.padEnd(16),
      String(b.pr).padEnd(6),
      `http://${b.domain}`.padEnd(34),
      pc.dim(b.createdAt),
    );
  }
}
