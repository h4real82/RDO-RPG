import { describe, expect, it } from 'vitest';
import { worldManifestSchema } from '../src';

const placement = {
  id: 'valentine:saloon:001',
  asset: 'models/valentine/saloon.glb',
  position: { x: 10, y: 0.005, z: -20 },
  rotation: { x: 0, y: 1.2, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  layer: 'buildings',
  chunkId: '0:-1',
  lod: 0,
};

describe('world manifest schema', () => {
  it('accepts a complete deterministic placement', () => {
    expect(worldManifestSchema.parse({ version: 1, world: 'valentine', placements: [placement] }))
      .toMatchObject({ placements: [placement] });
  });

  it.each([
    ['missing asset', { ...placement, asset: '' }],
    ['a raw-data traversal asset path', { ...placement, asset: '../../data/raw/saloon.ydr' }],
    ['invalid layer', { ...placement, layer: 'water' }],
    ['non-finite transform', { ...placement, position: { ...placement.position, x: Number.POSITIVE_INFINITY } }],
    ['missing height', { ...placement, position: { x: 10, z: -20 } }],
    ['an unknown object field', { ...placement, objectType: 'unrecognized' }],
  ])('rejects a placement with %s', (_reason, invalidPlacement) => {
    expect(() => worldManifestSchema.parse({ version: 1, world: 'valentine', placements: [invalidPlacement] }))
      .toThrow();
  });
});
