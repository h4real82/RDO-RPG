import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
const require = createRequire(realpathSync(new URL('../node_modules/@gltf-transform/cli/package.json', import.meta.url)));
const { Document } = require('@gltf-transform/core');

test('removes unused preview masks while preserving geometry and authored vertex colors', async () => {
  const { stripPreviewMasks } = await import('./strip-preview-masks.mjs');
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc.createAccessor().setType('VEC3').setArray(new Float32Array([0,0,0,1,0,0,0,1,0])).setBuffer(buffer);
  const mask = doc.createAccessor().setType('VEC4').setArray(new Float32Array(12)).setBuffer(buffer);
  const retained = doc.createAccessor().setType('VEC4').setArray(new Float32Array(12).fill(1)).setBuffer(buffer);
  const preview = doc.createMaterial().setExtras({ rdo_material_status: 'diffuse-only' });
  const a = doc.createPrimitive().setMaterial(preview).setAttribute('POSITION',position).setAttribute('COLOR_0',mask);
  const b = doc.createPrimitive().setMaterial(doc.createMaterial()).setAttribute('POSITION',position).setAttribute('COLOR_0',retained);
  doc.createMesh().addPrimitive(a).addPrimitive(b);
  assert.equal(stripPreviewMasks(doc), 48);
  assert.equal(a.getAttribute('COLOR_0'), null);
  assert.equal(a.getAttribute('POSITION'), position);
  assert.equal(b.getAttribute('COLOR_0'), retained);
  assert.ok(doc.getRoot().listAccessors().includes(retained));
  assert.ok(!doc.getRoot().listAccessors().includes(mask));
});
