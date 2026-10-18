import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { expect, it } from 'vitest';
import { VisibleMeshCollision } from './VisibleMeshCollision';

it('checks a stationary body against actual wall triangles, not the enclosing building box', () => {
  const collision = new VisibleMeshCollision();
  const building = new Group();
  building.add(box(-2, 1, 0, 2, 2, 0.25), box(2, 1, 0, 2, 2, 0.25));
  collision.add(building);
  expect(collision.overlapsBody).toBeTypeOf('function');
  expect(collision.overlapsBody({x:0,y:0,z:0})).toBe(false);
  expect(collision.overlapsBody({x:1.1,y:0,z:0})).toBe(true);
  expect(collision.lastHit?.mesh).toBe('test-wall');
});

it('body checks ignore floors below the walking body, decals and hidden meshes, and catch either wall side', () => {
  const collision = new VisibleMeshCollision(), building = new Group();
  const floor=box(0,-0.1,0,10,0.2,10), hidden=box(0,1,0,2,2,2), decal=box(0,1,0,2,2,2);
  hidden.visible=false;(decal.material as MeshBasicMaterial).userData.rdo_draw_bucket=2;
  building.add(floor,hidden,decal);collision.add(building);
  expect(collision.overlapsBody).toBeTypeOf('function');
  expect(collision.overlapsBody({x:0,y:0,z:0})).toBe(false);
  const wall=new Mesh(new PlaneGeometry(4,2),new MeshBasicMaterial());wall.position.y=1;wall.name='one-sided';
  building.add(wall);collision.add(building);
  expect(collision.overlapsBody({x:0,y:0,z:-0.1})).toBe(true);
  expect(collision.overlapsBody({x:0,y:0,z:0.1})).toBe(true);
  collision.remove(building);expect(collision.overlapsBody({x:0,y:0,z:0})).toBe(false);
});

it('ignores decal submeshes without disabling actual walls of the same building', () => {
  const building = new Group();
  const decal = box(0, 1, 0, 10, 2, 0.01);
  (decal.material as MeshBasicMaterial).userData = { rdo_draw_bucket: 2 };
  const wall = box(0, 1, 3, 10, 2, 0.2);
  building.add(decal, wall);
  const collision = new VisibleMeshCollision(); collision.add(building);
  expect(collision.blocksTransition({ x: 0, y: 0, z: -0.4 }, { x: 0, y: 0, z: 0.4 })).toBe(false);
  expect(collision.blocksTransition({ x: 0, y: 0, z: 2.6 }, { x: 0, y: 0, z: 3.4 })).toBe(true);
});

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
