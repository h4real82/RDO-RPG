import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'data/runtime/valentine/verified-scene/rdo_world_manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const existingIds = new Set(manifest.placements.map(p => p.id));
const existingAssets = new Set(manifest.placements.map(p => p.asset));

const landmarks = [
  {
    asset: 'models/valentine/val_01_trainstn_ext.glb',
    chunkId: '-1:-3',
    id: 'source:456e951a5bb64fca',
    layer: 'buildings',
    lod: 0,
    position: {
      x: -177.0218,
      y: 119.26,
      z: -633.8562
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    tags: [
      'exterior',
      'source-verified',
      'source:levels_1:0x5B8D0DA4',
      'landmark:station'
    ]
  },
  {
    asset: 'models/valentine/val_05_church_ext.glb',
    chunkId: '-2:-4',
    id: 'source:4cb76ef61d0b699f',
    layer: 'buildings',
    lod: 0,
    position: {
      x: -226.5936,
      y: 133.6269,
      z: -804.0024
    },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    tags: [
      'exterior',
      'source-verified',
      'source:levels_1:0x00344613',
      'landmark:church'
    ]
  }
];

let added = 0;
for (const lm of landmarks) {
  if (!existingIds.has(lm.id) && !existingAssets.has(lm.asset)) {
    manifest.placements.push(lm);
    added++;
    console.log(`Added landmark placement: ${lm.asset} at (${lm.position.x}, ${lm.position.y}, ${lm.position.z})`);
  }
}

if (added > 0) {
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Updated manifest with ${added} landmarks; total placements: ${manifest.placements.length}`);
} else {
  console.log('Landmarks already present in manifest.');
}

