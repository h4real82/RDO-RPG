import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { expect, it } from 'vitest';
import type { WorldPlacement } from '@rdo-rpg/world-contracts';
import { describeSelection } from './MapDiagnostics';

it('reports the picked mesh, exact source coordinates and material status', () => {
  const material = new MeshStandardMaterial();
  material.userData = { rdo_shader_hash: '0xec8e6107', rdo_material_status: 'diffuse-only' };
  const mesh = new Mesh(new BoxGeometry(), material); mesh.name = 'source-mesh-17';
  const placement: WorldPlacement = { id: 'road', asset: 'models/valentine/val_03_road_d_11.glb',
    position: { x: -177, y: 119, z: -633 }, rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 }, layer: 'roadsAndRails', chunkId: '-1:-3', lod: 0,
    tags: ['role:decal', 'collision:none', 'occlusion:none'] };
  const source = [{ sourceFile: 'sector_ymap.xml', entityIndex: 22 }];
  const result = describeSelection(placement, mesh, new Vector3(-176.8, 119.3, -632.9), source);
  expect(result.gamePoint).toEqual({ x: -176.8, y: 632.9, z: 119.3 });
  expect(result.mesh).toBe('source-mesh-17');
  expect(result.sources).toEqual(source);
  expect(result.materials[0]).toMatchObject({ shaderHash: '0xec8e6107', status: 'diffuse-only' });
  expect(result.roles.obstacle).toBe(false);
});
