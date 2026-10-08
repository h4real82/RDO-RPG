import { Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { expect, it } from 'vitest';
import * as lod from './DrawableLod';

it('renders only the highest source LOD while keeping unclassified geometry visible', () => {
  const root = new Group();
  const nodes = ['geometry0__model0__lod_hi__gate', 'geometry0__model0__lod_med__gate', 'geometry0__model0__lod_low__gate', 'unclassified'].map((name) => {
    const mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    mesh.name = name;
    root.add(mesh);
    return mesh;
  });
  expect('selectHighestDrawableLod' in lod).toBe(true);
  lod.selectHighestDrawableLod(root);
  expect(nodes.map((node) => node.visible)).toEqual([true, false, false, true]);
  nodes.forEach((node) => { node.geometry.dispose(); node.material.dispose(); });
});

it('keeps the best available source LOD when high detail is absent', () => {
  const root = new Group();
  const medium = new Group(); medium.name = 'lod_med__gate'; root.add(medium);
  const low = new Group(); low.name = 'lod_low__gate'; root.add(low);
  lod.selectHighestDrawableLod(root);
  expect(medium.visible).toBe(true);
  expect(low.visible).toBe(false);
});
