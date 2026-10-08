import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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

test('starts a project-scoped filesystem MCP with read and write tools', async () => {
  const child = spawn(process.execPath, ['tools/obsidian-filesystem-mcp.mjs'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let output = '';
  let errors = '';
  let requestedTools = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`MCP handshake timed out: ${errors}`)), 20_000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (!requestedTools && output.includes('"id":1')) {
        requestedTools = true;
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })}\n`);
        child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);
      }
      if (output.includes('"id":2')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', (chunk) => { errors += chunk; });
    child.on('error', reject);
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'rdo-rpg-test', version: '1.0.0' } },
    })}\n`);
  }).finally(() => child.kill());

  const toolResponse = output.split(/\r?\n/).map((line) => line.trim()).find((line) => line.includes('"id":2'));
  assert.ok(toolResponse, `missing tools/list response: ${output}`);
  const toolNames = JSON.parse(toolResponse).result.tools.map((tool) => tool.name);
  assert.ok(toolNames.includes('read_file'));
  assert.ok(toolNames.includes('write_file'));
});
