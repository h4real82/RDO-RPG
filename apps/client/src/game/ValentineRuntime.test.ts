import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { WorldManifest } from '@rdo-rpg/world-contracts';

import * as runtime from './ValentineRuntime';
import { applyPlacementTransform, selectSpawnPosition } from './ValentineRuntime';

describe('selectSpawnPosition', () => {
  it('uses the first ground-truth manifest placement as the local preview spawn', () => {
    const manifest = { version: 1, world: 'valentine', placements: [
      { id: 'station', asset: 'models/valentine/station.glb', position: { x: -300, y: 100, z: 700 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '-2:2', lod: 0 },
    ] } satisfies WorldManifest;

    expect(selectSpawnPosition(manifest)).toEqual({ x: -300, y: 100, z: 700 });
  });
});

it('checks the entire camera-player segment for occluders', () => {
  expect('createOcclusionRay' in runtime).toBe(true);
  const ray = runtime.createOcclusionRay(new Vector3(0, 10, 10), new Vector3(0, 0, 0));
  expect(ray.far).toBeCloseTo(Math.sqrt(200));
  expect(ray.ray.direction.length()).toBeCloseTo(1);
  const wall = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  wall.position.set(0, 5, 5);
  wall.updateMatrixWorld(true);
  expect(ray.intersectObject(wall)).not.toHaveLength(0);
  wall.position.set(0, -5, -5);
  wall.updateMatrixWorld(true);
  expect(ray.intersectObject(wall)).toHaveLength(0);
  wall.geometry.dispose();
  wall.material.dispose();
});

it('keeps Blender-exported Y-up GLB geometry upright while applying a world-Y heading', () => {
  const instance = new Group();
  const placement = {
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    scale: { x: 4, y: 5, z: 6 },
  };

  applyPlacementTransform(instance, placement);

  expect(instance.position).toMatchObject({ x: 1, y: 2, z: 3 });
  expect(new Vector3(0, 1, 0).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 1, 0));
  expect(new Vector3(1, 0, 0).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 0, -1));
  expect(instance.scale).toMatchObject({ x: 4, y: 5, z: 6 });
});
