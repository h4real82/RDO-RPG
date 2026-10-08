import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { WorldManifest } from '@rdo-rpg/world-contracts';

import { applyPlacementTransform, selectSpawnPosition } from './ValentineRuntime';

describe('selectSpawnPosition', () => {
  it('uses the first ground-truth manifest placement as the local preview spawn', () => {
    const manifest = { version: 1, world: 'valentine', placements: [
      { id: 'station', asset: 'models/valentine/station.glb', position: { x: -300, y: 100, z: 700 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '-2:2', lod: 0 },
    ] } satisfies WorldManifest;

    expect(selectSpawnPosition(manifest)).toEqual({ x: -300, y: 100, z: 700 });
  });
});

it('keeps Z-up GLB geometry upright while applying a world-Y heading', () => {
  const instance = new Group();
  const placement = {
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    scale: { x: 4, y: 5, z: 6 },
  };

  applyPlacementTransform(instance, placement);

  expect(instance.position).toMatchObject({ x: 1, y: 2, z: 3 });
  expect(new Vector3(0, 0, 1).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 1, 0));
  expect(new Vector3(1, 0, 0).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 0, -1));
  expect(instance.scale).toMatchObject({ x: 4, y: 5, z: 6 });
});
