import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('build emits a strict JSON schema for cross-language validators', async () => {
  const schema = JSON.parse(await readFile(new URL('../schema/world-manifest.schema.json', import.meta.url), 'utf8'));
  const manifest = schema.definitions.WorldManifest;
  assert.equal(schema.$ref, '#/definitions/WorldManifest');
  assert.equal(manifest.additionalProperties, false);
  assert.deepEqual(manifest.required, ['version', 'world', 'placements']);
  assert.equal(manifest.properties.placements.type, 'array');
});
