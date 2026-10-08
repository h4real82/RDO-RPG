import assert from 'node:assert/strict';
import test from 'node:test';

test('compiled public entry is importable by Node', async () => {
  const contracts = await import('../dist/index.js');
  assert.equal(contracts.CHUNK_SIZE, 250);
  assert.equal(typeof contracts.worldManifestSchema.parse, 'function');
});
