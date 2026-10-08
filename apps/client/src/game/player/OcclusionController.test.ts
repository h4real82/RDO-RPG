import { BoxGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { OcclusionController } from './OcclusionController';
import { OrthographicFollowCamera } from './OrthographicFollowCamera';

describe('world presentation', () => {
  it('uses an orthographic camera that follows the player target', () => {
    const controller = new OrthographicFollowCamera(16 / 9);
    controller.update(new Vector3(12, 0, 5));

    expect(controller.camera).toBeInstanceOf(OrthographicCamera);
    expect(controller.camera.position.x).toBe(12);
    expect(controller.camera.top - controller.camera.bottom).toBe(90);
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
    expect(material.opacity).toBe(1);
    expect(material.depthWrite).toBe(true);
  });
});
