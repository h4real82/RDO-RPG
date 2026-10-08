import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVaultRoot } from './obsidian-filesystem-mcp.mjs';

test('resolves the versioned Obsidian vault relative to the checked-out project', () => {
  assert.match(resolveVaultRoot(), /RDO-RPG[\\/]docs[\\/]Obsidian$/);
});
