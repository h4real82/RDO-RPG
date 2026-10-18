import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { TerrainGround } from './TerrainGround';

it('picks actual floor triangles below a roof and rejects empty screen rays', () => {
  const ground=new TerrainGround(),group=new Group();
  for(const y of [0,5]){const mesh=new Mesh(new PlaneGeometry(4,4),new MeshBasicMaterial({side:DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.y=y;group.add(mesh);}
  ground.add(group,'structure');
  expect(ground.pick(new Raycaster(new Vector3(0,10,0),new Vector3(0,-1,0)),0)?.y).toBeCloseTo(0);
  expect(ground.pick(new Raycaster(new Vector3(9,10,0),new Vector3(0,-1,0)),0)).toBeUndefined();
});

it('steps onto a low source floor but never snaps up to its roof', () => {
  const ground = new TerrainGround();
  const terrain = new Group();
  const floor = new Group();
  for (const [parent, height] of [[terrain, 0], [floor, 0.3], [floor, 4]] as const) {
    const mesh = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({ side: DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    parent.add(mesh);
  }
  ground.add(terrain);
  ground.add(floor, 'structure');
  expect(ground.heightAt(0, 0)).toBeCloseTo(0);
  expect(ground.heightAt(0, 0, 0)).toBeCloseTo(0.3);
  expect(ground.heightAt(0, 0, 0.3)).toBeCloseTo(0.3);
});

it('rejects upward jumps and never fills missing source terrain', () => {
  const ground = new TerrainGround();
  const structure = new Group();
  const mesh = new Mesh(new PlaneGeometry(2, 2), new MeshBasicMaterial({ side: DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 3;
  structure.add(mesh);
  ground.add(structure, 'structure');
  expect(ground.heightAt(0, 0, 0)).toBeUndefined();
  expect(ground.heightAt(20, 0, 0)).toBeUndefined();
  expect(ground.heightAt(0, 0, 3)).toBeCloseTo(3);
  ground.remove(structure);
  expect(ground.heightAt(0, 0, 3)).toBeUndefined();
});

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

it('rejects a ramp hidden after registration as a click target but preserves physical support',()=>{
  const ground=new TerrainGround(),support=new Group();
  const ramp=new Mesh(new PlaneGeometry(3,5),new MeshBasicMaterial({side:DoubleSide}));ramp.rotation.x=-Math.PI/2;support.add(ramp);ground.add(support,'structure');
  const ray=new Raycaster(new Vector3(0,10,0),new Vector3(0,-1,0));
  expect(ground.pick(ray,0)?.y).toBeCloseTo(0);ramp.visible=false;
  expect(ground.pick(ray,0)).toBeUndefined();expect(ground.heightAt(0,0,0)).toBeCloseTo(0);
  ramp.visible=true;support.visible=false;expect(ground.pick(ray,0)).toBeUndefined();expect(ground.heightAt(0,0,0)).toBeCloseTo(0);
});
