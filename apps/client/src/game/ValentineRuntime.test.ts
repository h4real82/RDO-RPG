import { BoxGeometry, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Texture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { WorldManifest } from '@rdo-rpg/world-contracts';

import * as runtime from './ValentineRuntime';
import { applyPlacementTransform, selectSpawnPosition } from './ValentineRuntime';

it('applies manifest pitch and roll instead of flattening them to heading', () => {
  const instance = new Group();
  applyPlacementTransform(instance, {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
  expect(new Vector3(0, 1, 0).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 0, 1));
});

describe('selectSpawnPosition', () => {
  it('starts at a supplied source road point rather than a building origin', () => {
    const manifest = { version: 1, world: 'valentine', placements: [
      { id: 'bank', asset: 'models/valentine/val_bank_main_shell.glb', position: { x: 10, y: 120, z: 20 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '0:0', lod: 0 },
    ] } satisfies WorldManifest;

    expect(selectSpawnPosition(manifest, { x: 30, z: 40 })).toEqual({ x: 30, y: 0, z: 40 });
  });

  it('uses the first ground-truth manifest placement as the local preview spawn', () => {
    const manifest = { version: 1, world: 'valentine', placements: [
      { id: 'station', asset: 'models/valentine/station.glb', position: { x: -300, y: 100, z: 700 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '-2:2', lod: 0 },
    ] } satisfies WorldManifest;

    expect(selectSpawnPosition(manifest)).toEqual({ x: -300, y: 100, z: 700 });
  });

  it('does not move the spawn to a newly added terrain tile origin', () => {
    const manifest = { version: 1, world: 'valentine', placements: [
      { id: 'terrain', asset: 'models/valentine/terrain.glb', position: { x: -352, y: 116, z: 736 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'terrain', chunkId: '-2:2', lod: 0 },
      { id: 'saloon', asset: 'models/valentine/saloon.glb', position: { x: -300, y: 120, z: 750 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, layer: 'buildings', chunkId: '-2:3', lod: 0 },
    ] } satisfies WorldManifest;

    expect(selectSpawnPosition(manifest)).toEqual({ x: -300, y: 120, z: 750 });
  });
});

it('does not treat terrain meshes as player blockers or camera occluders', () => {
  expect(runtime.placementBlocksPlayerAndCamera({ layer: 'terrain' })).toBe(false);
  expect(runtime.placementBlocksPlayerAndCamera({ layer: 'buildings' })).toBe(true);
});

it('excludes the source reflection helper without excluding bank geometry', () => {
  expect(runtime.isRenderablePlacement({ asset: 'models/valentine/val_bank_int_reflection_proxy.glb' })).toBe(false);
  expect(runtime.isRenderablePlacement({ asset: 'models/valentine/val_bank_int_ref.glb' })).toBe(true);
});

it('disables unverified terrain vertex-color masks for neutral geometry previews', () => {
  const instance = new Group();
  const material = new MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
  instance.add(new Mesh(new BoxGeometry(1, 1, 1), material));

  runtime.disableTerrainVertexColorMultiplication(instance);

  expect(material.vertexColors).toBe(false);
  instance.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
  material.dispose();
});

it('keeps decoded mask channels from blackening diffuse-only imported materials', () => {
  const instance = new Group();
  const preview = new MeshBasicMaterial({ vertexColors: true });
  preview.userData.rdo_material_status = 'diffuse-only';
  const authored = new MeshBasicMaterial({ vertexColors: true });
  const geometry = new BoxGeometry(1, 1, 1);
  instance.add(new Mesh(geometry, [preview, authored]));

  runtime.prepareDrawableMaterialPreview(instance);

  expect(preview.vertexColors).toBe(false);
  expect(authored.vertexColors).toBe(true);
  geometry.dispose();
  preview.dispose();
  authored.dispose();
});

it('configures a four-layer terrain preview only from complete exported metadata', async () => {
  const instance = new Group();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0]), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0]), 2));
  geometry.setAttribute('color_1', new BufferAttribute(new Float32Array([1, 0, 0, 1]), 4));
  const material = new MeshStandardMaterial();
  Object.assign(material.userData, {
    rdo_material_status: 'terrain-four-layer-preview',
    rdo_terrain_lookup: 'lookup.png',
    rdo_terrain_layer0: 'layer0.png',
    rdo_terrain_layer1: 'layer1.png',
    rdo_terrain_layer2: 'layer2.png',
    rdo_terrain_layer3: 'layer3.png',
  });
  instance.add(new Mesh(geometry, material));
  const loaded: string[] = [];

  await runtime.prepareTerrainFourLayerPreview(instance, async (url) => {
    loaded.push(url);
    return new Texture();
  });

  expect(loaded).toEqual([
    '/runtime/valentine/local-preview/textures/terrain/lookup.png',
    '/runtime/valentine/local-preview/textures/terrain/layer0.png',
    '/runtime/valentine/local-preview/textures/terrain/layer1.png',
    '/runtime/valentine/local-preview/textures/terrain/layer2.png',
    '/runtime/valentine/local-preview/textures/terrain/layer3.png',
  ]);
  expect(material.userData.rdo_terrain_preview_ready).toBe(true);
  expect(material.customProgramCacheKey()).toBe('rdo-terrain-four-layer-v1');
  geometry.dispose();
  material.dispose();
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

it('keeps the Blender GLB basis right-handed without reflective instance scale', () => {
  const instance = new Group();
  const placement = {
    position: { x: 1, y: 2, z: 3 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
    scale: { x: 4, y: 5, z: 6 },
  };

  applyPlacementTransform(instance, placement);
  instance.updateMatrix();

  expect(instance.position).toMatchObject({ x: 1, y: 2, z: 3 });
  expect(new Vector3(0, 1, 0).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 1, 0));
  expect(new Vector3(1, 0, 0).applyQuaternion(instance.quaternion).round()).toEqual(new Vector3(0, 0, -1));
  expect(instance.scale).toMatchObject({ x: 4, y: 5, z: 6 });
  expect(instance.matrix.determinant()).toBeGreaterThan(0);
});

it('maps Blender local geometry into the right-handed game-Y-negative world-Z basis', () => {
  const instance = new Group();
  applyPlacementTransform(instance, {
    position: { x: 10, y: 30, z: -20 },
    rotation: { x: 0, y: -Math.PI / 2, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
  instance.updateMatrixWorld(true);
  // Game-local (1,2,3) becomes GLB (1,3,-2).
  // Stored +90deg game-Z quaternion is inverse orientation:
  // game world = (10,20,30) + (2,-1,3), Three world = (12,33,-19).
  const point = new Vector3(1, 3, -2).applyMatrix4(instance.matrixWorld);
  expect(point.x).toBeCloseTo(12);
  expect(point.y).toBeCloseTo(33);
  expect(point.z).toBeCloseTo(-19);
});
