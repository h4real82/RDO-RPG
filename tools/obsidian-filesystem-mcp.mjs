import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function resolveVaultRoot() {
  return resolve(projectRoot, 'docs', 'Obsidian');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(executable, ['-y', '@modelcontextprotocol/server-filesystem', resolveVaultRoot()], {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true,
  });
  child.on('error', (error) => {
    console.error('Could not start the project-scoped Obsidian filesystem MCP.', error);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => process.exitCode = code ?? (signal ? 1 : 0));
  for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => child.kill(event));
}
