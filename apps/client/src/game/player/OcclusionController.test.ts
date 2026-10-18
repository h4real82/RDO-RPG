import { BoxGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { OcclusionController } from './OcclusionController';
import { OrthographicFollowCamera } from './OrthographicFollowCamera';

describe('world presentation', () => {
  it('fades a real nearby wall before contact even when the camera segment is clear', () => {
    const wallMaterial=new MeshBasicMaterial(),floorMaterial=new MeshBasicMaterial(),farMaterial=new MeshBasicMaterial();
    const wall=new Mesh(new BoxGeometry(4,3,.1),wallMaterial);wall.position.set(0,1.5,-1);
    const floor=new Mesh(new BoxGeometry(4,.1,4),floorMaterial);floor.position.y=-.1;
    const distant=new Mesh(new BoxGeometry(1,3,.1),farMaterial);distant.position.set(10,1.5,0);
    [wall,floor,distant].forEach(m=>m.updateWorldMatrix(true,false));
    const controller=new OcclusionController([wall,floor,distant]);
    const clearRay=new Raycaster(new Vector3(0,1,5),new Vector3(0,0,1),0,1);
    for(let i=0;i<30;i++)controller.update(clearRay,new Vector3(0,0,0),1/60);
    expect(wallMaterial.opacity).toBeCloseTo(.15,3);expect(wallMaterial.depthWrite).toBe(false);
    expect(floorMaterial.opacity).toBe(1);expect(farMaterial.opacity).toBe(1);
    controller.dispose();[wall,floor,distant].forEach(m=>m.geometry.dispose());[wallMaterial,floorMaterial,farMaterial].forEach(m=>m.dispose());
  });
  it('does not raycast an invisible LOD while a visible blocker still fades', () => {
    const hidden=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),group=new Group();group.visible=false;group.add(hidden);
    let calls=0;const original=hidden.raycast;hidden.raycast=function(ray,hits){calls++;original.call(this,ray,hits);};
    const visible=new Mesh(new BoxGeometry(),new MeshBasicMaterial());group.updateWorldMatrix(true,true);visible.updateWorldMatrix(true,false);
    const controller=new OcclusionController([group,visible]);controller.update(new Raycaster(new Vector3(0,0,2),new Vector3(0,0,-1),0,4));
    expect(calls).toBe(0);expect((visible.material as MeshBasicMaterial).opacity).toBeLessThan(1);
    controller.dispose();hidden.geometry.dispose();visible.geometry.dispose();(hidden.material as MeshBasicMaterial).dispose();(visible.material as MeshBasicMaterial).dispose();
  });
  it('fades equally over the same elapsed time at 30 and 60 frames per second', () => {
    const opacity=(frames:number,delta:number)=>{
      const material=new MeshBasicMaterial(),mesh=new Mesh(new BoxGeometry(),material);mesh.updateWorldMatrix(true,false);
      const controller=new OcclusionController([mesh]),ray=new Raycaster(new Vector3(0,0,2),new Vector3(0,0,-1),0,4);
      for(let i=0;i<frames;i++)controller.update(ray,undefined,delta);
      const value=material.opacity;controller.dispose();mesh.geometry.dispose();material.dispose();return value;
    };
    const fast=opacity(6,1/60),slow=opacity(3,1/30);
    expect(fast).toBeCloseTo(slow,10);expect(slow).toBeGreaterThan(.15);expect(slow).toBeLessThan(.3);
  });
  it('does not invalidate an unchanged shader program on every fade frame', () => {
    const material=new MeshBasicMaterial(),mesh=new Mesh(new BoxGeometry(),material);mesh.updateWorldMatrix(true,false);
    const controller=new OcclusionController([mesh]),ray=new Raycaster(new Vector3(0,0,2),new Vector3(0,0,-1),0,4);
    controller.update(ray);const version=material.version;controller.update(ray);
    expect(material.version).toBe(version);controller.dispose();mesh.geometry.dispose();material.dispose();
  });
  it('ignores invalid frame durations without corrupting material state', () => {
    const material=new MeshBasicMaterial(),mesh=new Mesh(new BoxGeometry(),material);mesh.updateWorldMatrix(true,false);
    const controller=new OcclusionController([mesh]),ray=new Raycaster(new Vector3(0,0,2),new Vector3(0,0,-1),0,4);
    for(const delta of [0,-1,NaN,Infinity])controller.update(ray,undefined,delta);
    expect(material.opacity).toBe(1);expect(material.depthWrite).toBe(true);controller.dispose();mesh.geometry.dispose();material.dispose();
  });
  it('fades only the hit physical material group of a multi-material mesh', () => {
    const a = new MeshBasicMaterial(), b = new MeshBasicMaterial();
    const geometry = new BoxGeometry(); geometry.clearGroups(); geometry.addGroup(0, 6, 0); geometry.addGroup(6, 30, 1);
    const mesh = new Mesh(geometry, [a, b]); mesh.updateWorldMatrix(true, false);
    const controller = new OcclusionController([mesh]);
    const ray = new Raycaster(new Vector3(2, 0, 0), new Vector3(-1, 0, 0), 0, 4);
    for (let i = 0; i < 30; i++) controller.update(ray);
    expect(a.opacity).toBeCloseTo(0.15, 3); expect(b.opacity).toBe(1); expect(b.depthWrite).toBe(true);
    controller.dispose(); geometry.dispose(); a.dispose(); b.dispose();
  });
  it('does not fade physical neighbours when the actual hit group is a decal', () => {
    const decal = new MeshBasicMaterial(), wall = new MeshBasicMaterial(); decal.userData.rdo_draw_bucket = 2;
    const geometry = new BoxGeometry(); geometry.clearGroups(); geometry.addGroup(0, 6, 0); geometry.addGroup(6, 30, 1);
    const mesh = new Mesh(geometry, [decal, wall]); mesh.updateWorldMatrix(true, false);
    const controller = new OcclusionController([mesh]);
    controller.update(new Raycaster(new Vector3(2, 0, 0), new Vector3(-1, 0, 0), 0, 4));
    expect(wall.opacity).toBe(1); expect(decal.opacity).toBe(1);
    controller.dispose(); geometry.dispose(); decal.dispose(); wall.dispose();
  });
  it('preserves cutout coverage while fading instead of discarding the entire roof', () => {
    const material = new MeshBasicMaterial({ alphaTest: 0.5 });
    const roof = new Mesh(new BoxGeometry(1, 1, 1), material);
    const occlusion = new OcclusionController([roof]);
    const ray = new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1));
    for (let i = 0; i < 30; i++) occlusion.update(ray);
    expect(material.opacity).toBeCloseTo(0.15, 3);
    expect(material.alphaTest / material.opacity).toBeCloseTo(0.5, 5);
    occlusion.dispose();
    expect(material.alphaTest).toBe(0.5);
    expect(material.opacity).toBe(1);
  });
  it('ignores meshes under a hidden LOD parent', () => {
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
    const lod = new Group();
    lod.visible = false;
    lod.add(mesh);
    lod.updateMatrixWorld(true);
    const occlusion = new OcclusionController([lod]);
    occlusion.update(new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1)));
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
    occlusion.dispose();
    mesh.geometry.dispose();
    material.dispose();
  });
  it('uses an orthographic camera that follows the player target', () => {
    const controller = new OrthographicFollowCamera(16 / 9);
    controller.update(new Vector3(12, 0, 5));

    expect(controller.camera).toBeInstanceOf(OrthographicCamera);
    expect(controller.camera.position.x).toBe(12);
    expect(controller.camera.top - controller.camera.bottom).toBe(36);
  });

  it('fades intersecting occluders and restores them after the ray clears', () => {
    const material = new MeshBasicMaterial({ opacity: 1, transparent: false, depthWrite: true });
    const roof = new Mesh(new BoxGeometry(1, 1, 1), material);
    roof.position.set(0, 0, 0);
    const occlusion = new OcclusionController([roof]);
    const ray = new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1));

    occlusion.update(ray);
    expect(material.opacity).toBeLessThan(1);
    for (let index = 0; index < 20; index += 1) occlusion.update(ray);
    expect(material.opacity).toBeCloseTo(0.15, 3);
    expect(material.depthWrite).toBe(false);

    ray.set(new Vector3(10, 0, 2), new Vector3(0, 0, -1));
    occlusion.update(ray);
    expect(material.opacity).toBeGreaterThan(0.15);
    expect(material.opacity).toBeLessThan(1);
    expect(material.depthWrite).toBe(false);
    for (let index = 0; index < 30; index += 1) occlusion.update(ray);
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
    expect(material.transparent).toBe(false);
    occlusion.dispose();
    roof.geometry.dispose();
    material.dispose();
  });
  it('keeps a nearby roof fading when unrelated distant geometry cannot be raycast', () => {
    const material = new MeshBasicMaterial();
    const roof = new Mesh(new BoxGeometry(1, 1, 1), material);
    const distant = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    distant.position.set(100, 0, 0);
    distant.raycast = () => { throw new Error('distant geometry must not be visited'); };
    roof.updateWorldMatrix(true, false);
    distant.updateWorldMatrix(true, false);
    const occlusion = new OcclusionController([roof, distant]);
    occlusion.update(new Raycaster(new Vector3(0, 0, 2), new Vector3(0, 0, -1), 0, 4));
    expect(material.opacity).toBeLessThan(1);
    occlusion.dispose();
    roof.geometry.dispose();
    distant.geometry.dispose();
    material.dispose();
    (distant.material as MeshBasicMaterial).dispose();
  });
});
