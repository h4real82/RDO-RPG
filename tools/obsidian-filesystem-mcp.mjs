import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function resolveVaultRoot() {
  return resolve(projectRoot, 'docs', 'Obsidian');
}

export function mcpLaunchSpec(platform = process.platform, vaultRoot = resolveVaultRoot(), nodeExecutable = process.execPath) {
  if (platform === 'win32') {
    return {
      executable: nodeExecutable,
      args: [resolve(dirname(nodeExecutable), 'node_modules', 'npm', 'bin', 'npx-cli.js'), '-y', '@modelcontextprotocol/server-filesystem', vaultRoot],
      options: { shell: false, windowsHide: true },
    };
  }
  return {
    executable: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', vaultRoot],
    options: { shell: false, windowsHide: true },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const launch = mcpLaunchSpec();
  const child = spawn(launch.executable, launch.args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...launch.options,
  });
  child.on('error', (error) => {
    console.error('Could not start the project-scoped Obsidian filesystem MCP.', error);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => process.exitCode = code ?? (signal ? 1 : 0));
  for (const event of ['SIGINT', 'SIGTERM']) process.on(event, () => child.kill(event));
}
