import { BoxGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { expect, it } from 'vitest';
import { TerrainGround } from './TerrainGround';
import { VisibleMeshCollision } from './VisibleMeshCollision';
import { SourceTraversal } from './SourceTraversal';
import { createPlayableBoundary } from '@rdo-rpg/world-contracts';

it('checks the entire boundary span before missing terrain and blocks entry from outside', () => {
  const boundary = createPlayableBoundary([[0,0],[10,0],[10,10],[0,10]], .25);
  const traversal = new SourceTraversal(new TerrainGround(), new VisibleMeshCollision(), boundary);
  expect(traversal.resolve({x:9,y:0,z:5},{x:11,y:0,z:5})).toBe(false);
  expect(traversal.blockedReason).toBe('boundary');
  expect(traversal.resolve({x:11,y:0,z:5},{x:9,y:0,z:5})).toBe(false);
  expect(traversal.blockedReason).toBe('boundary');
  expect(traversal.resolve({x:5,y:0,z:5},{x:6,y:0,z:5})).toBe(false);
  expect(traversal.blockedReason).toBe('terrain');
});

function floor(x: number, y: number, width: number): Group {
  const group = new Group();
  const mesh = new Mesh(new PlaneGeometry(width, 10), new MeshBasicMaterial({ side: DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, 0);
  group.add(mesh);
  return group;
}

it('resolves the candidate to a real low structural floor', () => {
  const ground = new TerrainGround();
  ground.add(floor(0, 0, 10));
  ground.add(floor(1, 0.3, 2), 'structure');
  const traversal = new SourceTraversal(ground, new VisibleMeshCollision());
  const candidate = { x: 0.6, y: 0, z: 0 };
  expect(traversal.resolve({ x: -0.1, y: 0, z: 0 }, candidate)).toBe(true);
  expect(candidate.y).toBeCloseTo(0.3);
});

it('never steps through a wall to reach a floor behind it', () => {
  const ground = new TerrainGround();
  ground.add(floor(0, 0, 10));
  ground.add(floor(1.5, 0.3, 2), 'structure');
  const collision = new VisibleMeshCollision();
  const building = new Group();
  const wall = new Mesh(new BoxGeometry(0.05, 2, 10), new MeshBasicMaterial());
  wall.position.set(0, 1, 0); building.add(wall); collision.add(building);
  const traversal = new SourceTraversal(ground, collision);
  const candidate = { x: 0.8, y: 0, z: 0 };
  expect(traversal.resolve({ x: -0.8, y: 0, z: 0 }, candidate)).toBe(false);
  expect(traversal.blockedReason).toBe('obstacle');
  expect(candidate.y).toBe(0);
});

it('does not jump over a missing source strip during a slow frame', () => {
  const ground = new TerrainGround();
  ground.add(floor(-2.1, 0, 4));
  ground.add(floor(2.1, 0, 4));
  const traversal = new SourceTraversal(ground, new VisibleMeshCollision());
  expect(traversal.resolve({ x: -0.5, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 })).toBe(false);
  expect(traversal.blockedReason).toBe('terrain');
});

it('blocks a low wall while descending from a real ledge to a lower floor', () => {
  const ground = new TerrainGround();
  ground.add(floor(-1.05, 1.5, 2));
  ground.add(floor(1, 0, 2));
  const collision = new VisibleMeshCollision();
  const building = new Group();
  const wall = new Mesh(new BoxGeometry(0.1, 1.2, 10), new MeshBasicMaterial());
  wall.position.set(0.05, 0.6, 0); building.add(wall); collision.add(building);
  const candidate = { x: 0.1, y: 1.5, z: 0 };
  const traversal = new SourceTraversal(ground, collision);
  expect(traversal.resolve({ x: -0.1, y: 1.5, z: 0 }, candidate)).toBe(false);
  expect(traversal.blockedReason).toBe('obstacle');
  expect(candidate.y).toBe(1.5);
});
