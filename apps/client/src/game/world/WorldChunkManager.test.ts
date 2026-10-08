import { describe, expect, it, vi } from 'vitest';
import type { WorldManifest, WorldPlacement } from '@rdo-rpg/world-contracts';

import { WorldChunkManager } from './WorldChunkManager';
import { disposeObjectResources } from './ResourceDisposer';

const manifest: WorldManifest = {
  version: 1,
  world: 'valentine',
  placements: [
    {
      id: 'saloon', asset: 'models/valentine/saloon.glb', position: { x: 1, y: 0.005, z: 1 },
      rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '0:0', lod: 0,
    },
    {
      id: 'station', asset: 'models/valentine/station.glb', position: { x: 251, y: 0.005, z: 1 },
      rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '1:0', lod: 0,
    },
  ],
};

describe('WorldChunkManager', () => {
  it('loads the player chunk and available neighbours only once', async () => {
    const instantiate = vi.fn<[WorldPlacement], Promise<{ dispose(): void }>>(async () => ({ dispose: vi.fn() }));
    const manager = new WorldChunkManager(manifest, instantiate);

    await manager.update(1, 1);
    await manager.update(1, 1);

    expect(instantiate).toHaveBeenCalledTimes(2);
    expect(instantiate.mock.calls.map(([placement]) => placement.id)).toEqual(['saloon', 'station']);
  });

  it('disposes chunk resources once after the player leaves their neighbourhood', async () => {
    const saloon = { dispose: vi.fn() };
    const station = { dispose: vi.fn() };
    const instantiate = vi.fn<[WorldPlacement], Promise<{ dispose(): void }>>(async (placement) => placement.id === 'saloon' ? saloon : station);
    const manager = new WorldChunkManager(manifest, instantiate);

    await manager.update(1, 1);
    await manager.update(1001, 1);
    manager.dispose();

    expect(saloon.dispose).toHaveBeenCalledTimes(1);
    expect(station.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes geometry and material resources exactly once', () => {
    const geometry = { dispose: vi.fn() };
    const material = { dispose: vi.fn() };
    const object = {
      traverse: (visit: (node: { geometry: typeof geometry; material: typeof material }) => void) => visit({ geometry, material }),
    };

    disposeObjectResources(object);

    expect(geometry.dispose).toHaveBeenCalledTimes(1);
    expect(material.dispose).toHaveBeenCalledTimes(1);
  });
});
