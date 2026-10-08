import assert from 'node:assert/strict';
import test from 'node:test';
import * as wrapper from './obsidian-filesystem-mcp.mjs';
import { resolveVaultRoot } from './obsidian-filesystem-mcp.mjs';

test('resolves the versioned Obsidian vault relative to the checked-out project', () => {
  assert.match(resolveVaultRoot(), /RDO-RPG[\\/]docs[\\/]Obsidian$/);
});

test('uses Node directly for the Windows npx command wrapper', () => {
  assert.equal('mcpLaunchSpec' in wrapper, true);
  const launch = wrapper.mcpLaunchSpec('win32', 'C:\\Project Folder\\docs\\Obsidian', 'C:\\Node Runtime\\node.exe');

  assert.equal(launch.options.shell, false);
  assert.equal(launch.options.windowsHide, true);
  assert.equal(launch.executable, 'C:\\Node Runtime\\node.exe');
  assert.deepEqual(launch.args, [
    'C:\\Node Runtime\\node_modules\\npm\\bin\\npx-cli.js',
    '-y',
    '@modelcontextprotocol/server-filesystem',
    'C:\\Project Folder\\docs\\Obsidian',
  ]);
});
