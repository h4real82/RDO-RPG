import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { expect, it } from 'vitest';
import { TerrainGround } from './TerrainGround';

it('samples transformed terrain rather than an invented flat floor and removes unloaded tiles', () => {
  const tile = new Group();
  const mesh = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({ side: DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  tile.position.set(20, 7, 30);
  tile.add(mesh);
  tile.updateWorldMatrix(true, true);
  const ground = new TerrainGround();
  ground.add(tile);
  expect(ground.heightAt(20, 30)).toBeCloseTo(7);
  expect(ground.heightAt(200, 30)).toBeUndefined();
  ground.remove(tile);
  expect(ground.heightAt(20, 30)).toBeUndefined();
  mesh.geometry.dispose();
  mesh.material.dispose();
});

it('ignores hidden lower LOD meshes and follows a sloping surface', () => {
  const tile = new Group();
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const surface = new Mesh(new PlaneGeometry(10, 10), material);
  surface.rotation.x = -Math.PI / 2;
  tile.rotation.z = Math.PI / 4;
  const hidden = new Mesh(new PlaneGeometry(100, 100), material);
  hidden.rotation.x = -Math.PI / 2;
  hidden.position.y = 100;
  const hiddenParent = new Group();
  hiddenParent.visible = false;
  hiddenParent.add(hidden);
  tile.add(surface, hiddenParent);
  tile.updateWorldMatrix(true, true);
  const ground = new TerrainGround();
  ground.add(tile);
  expect(ground.heightAt(1, 0)).toBeCloseTo(1);
  expect(ground.heightAt(-1, 0)).toBeCloseTo(-1);
  surface.geometry.dispose();
  hidden.geometry.dispose();
  material.dispose();
});
