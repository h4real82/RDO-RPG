import { BoxGeometry, Group, Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { OcclusionController } from './OcclusionController';
import { OrthographicFollowCamera } from './OrthographicFollowCamera';

describe('world presentation', () => {
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
