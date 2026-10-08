import { describe, expect, it, vi } from 'vitest';
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

it('converts Z-up GLB local axes to the world contract orientation', () => {
  const instance = {
    position: { set: vi.fn() },
    rotation: { set: vi.fn() },
    scale: { set: vi.fn() },
  };
  const placement = {
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: 0.5, z: 0 },
    scale: { x: 4, y: 5, z: 6 },
  };

  applyPlacementTransform(instance, placement);

  expect(instance.position.set).toHaveBeenCalledWith(1, 2, 3);
  expect(instance.rotation.set).toHaveBeenCalledWith(Math.PI / 2, 0.5, 0);
  expect(instance.scale.set).toHaveBeenCalledWith(4, 5, -6);
});
