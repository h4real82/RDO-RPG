import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { expect, it } from 'vitest';
import { VisibleMeshCollision } from './VisibleMeshCollision';

const box = (x: number, y: number, z: number, w: number, h: number, d: number) => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial());
  mesh.name = 'test-wall';
  mesh.position.set(x, y, z);
  return mesh;
};

it('allows crossing a doorway in a building whose enclosing box spans the opening', () => {
  const building = new Group();
  building.add(box(-2, 1, 0, 2, 2, 0.25), box(2, 1, 0, 2, 2, 0.25));
  building.updateWorldMatrix(true, true);
  const collision = new VisibleMeshCollision();
  collision.add(building);
  expect(collision.blocksTransition({ x: 0, y: 0, z: -0.4 }, { x: 0, y: 0, z: 0.4 })).toBe(false);
  expect(collision.blocksTransition({ x: 2, y: 0, z: -0.4 }, { x: 2, y: 0, z: 0.4 })).toBe(true);
  expect(collision.lastHit?.mesh).toBeTruthy();
  collision.remove(building);
  expect(collision.blocksTransition({ x: 2, y: 0, z: -0.4 }, { x: 2, y: 0, z: 0.4 })).toBe(false);
  expect(collision.lastHit).toBeUndefined();
});

it('ignores high roofs and hidden LODs, while detecting low visible walls', () => {
  const building = new Group();
  building.add(box(0, 4, 0, 10, 0.2, 10));
  const hidden = box(0, 1, 0, 10, 2, 0.25);
  hidden.visible = false;
  building.add(hidden);
  building.updateWorldMatrix(true, true);
  const collision = new VisibleMeshCollision();
  collision.add(building);
  expect(collision.blocksTransition({ x: 0, y: 0, z: -0.4 }, { x: 0, y: 0, z: 0.4 })).toBe(false);
  const wall = box(0, 1, 0, 10, 2, 0.25);
  building.add(wall);
  building.updateWorldMatrix(true, true);
  collision.add(building);
  expect(collision.blocksTransition({ x: 0, y: 0, z: -0.4 }, { x: 0, y: 0, z: 0.4 })).toBe(true);
});

it('blocks a wall from its back face without changing the render material', () => {
  const building = new Group();
  const wall = new Mesh(new PlaneGeometry(4, 2), new MeshBasicMaterial());
  wall.name = 'one-sided-wall';
  wall.position.y = 1;
  building.add(wall);
  building.updateWorldMatrix(true, true);
  const collision = new VisibleMeshCollision();
  collision.add(building);
  expect(collision.blocksTransition({ x: 0, y: 0, z: -0.4 }, { x: 0, y: 0, z: 0.4 })).toBe(true);
  expect(collision.blocksTransition({ x: 0, y: 0, z: 0.4 }, { x: 0, y: 0, z: -0.4 })).toBe(true);
});
